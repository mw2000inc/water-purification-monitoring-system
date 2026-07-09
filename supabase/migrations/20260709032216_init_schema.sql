-- MW2000 ERP schema — mirrors src/lib/types/index.ts
-- Auth is handled by Supabase Auth (auth.users); app-specific fields live in public.profiles.

create extension if not exists "pgcrypto";

-- ---------- Roles / profiles ----------
create type public.app_role as enum ('admin', 'staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role public.app_role not null default 'staff',
  avatar_url text,
  phone text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
-- Reads name/role from the signup call's user_metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'staff')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Suppliers ----------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  email text not null,
  address text not null
);

-- ---------- Products ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  supplier_id uuid not null references public.suppliers(id),
  sku text not null unique,
  barcode text,
  stock_quantity integer not null default 0,
  min_stock_level integer not null default 0,
  purchase_price numeric(12, 2) not null default 0,
  selling_price numeric(12, 2) not null default 0,
  date_added date not null default current_date,
  last_updated date not null default current_date
);

-- ---------- Customers ----------
create sequence public.customer_order_seq;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  full_name text not null,
  company_name text,
  contract_number text not null,
  contract_start date not null,
  contract_end date not null,
  address text not null,
  email text not null,
  contact_number text not null,
  dispenser_type text not null,
  filter_installed boolean not null default false,
  installed_date date,
  assigned_technician text not null default '',
  notes text,
  created_at timestamptz not null default now()
);

create function public.set_customer_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'SK001-' || lpad(nextval('public.customer_order_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger set_order_number
  before insert on public.customers
  for each row execute function public.set_customer_order_number();

-- ---------- Contracts (kept in sync with each customer's own contract fields) ----------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  contract_number text not null,
  start_date date not null,
  end_date date not null
);

create function public.sync_customer_contract()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.contracts (customer_id, contract_number, start_date, end_date)
    values (new.id, new.contract_number, new.contract_start, new.contract_end);
  elsif tg_op = 'UPDATE' then
    update public.contracts
      set contract_number = new.contract_number,
          start_date = new.contract_start,
          end_date = new.contract_end
      where customer_id = new.id;
  end if;
  return new;
end;
$$;

create trigger customer_contract_sync
  after insert or update of contract_number, contract_start, contract_end on public.customers
  for each row execute function public.sync_customer_contract();

-- ---------- Sales ----------
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  date date not null,
  customer_id uuid not null references public.customers(id),
  sales_rep_id uuid not null references public.profiles(id),
  discount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  payment_method text not null,
  payment_status text not null
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  subtotal numeric(12, 2) not null
);

-- ---------- Stock movements ----------
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  product_id uuid not null references public.products(id),
  quantity_added integer not null default 0,
  quantity_removed integer not null default 0,
  reason text not null,
  user_id uuid not null references public.profiles(id),
  reference_number text not null
);

-- ---------- Notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  related_entity_id text
);

-- Applying a stock movement updates the product's live quantity and raises
-- low/out-of-stock notifications — runs regardless of who/what inserted the
-- movement (manual admin entry, or the sale-item trigger below).
create function public.apply_stock_movement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_qty integer;
  v_min integer;
  v_name text;
begin
  update public.products
    set stock_quantity = stock_quantity + new.quantity_added - new.quantity_removed,
        last_updated = new.date
    where id = new.product_id
    returning stock_quantity, min_stock_level, name into v_qty, v_min, v_name;

  if v_qty <= 0 then
    insert into public.notifications (type, message, related_entity_id)
    values ('out-of-stock', v_name || ' is out of stock.', new.product_id::text);
  elsif v_qty <= v_min then
    insert into public.notifications (type, message, related_entity_id)
    values ('low-stock', v_name || ' is running low (' || v_qty || ' left).', new.product_id::text);
  end if;

  return new;
end;
$$;

create trigger stock_movement_applied
  after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- A sale line item automatically records a "Sale" stock movement, which in
-- turn triggers apply_stock_movement() above to deduct inventory.
create function public.create_sale_stock_movement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_date date;
  v_user uuid;
  v_ref text;
begin
  select date, sales_rep_id, invoice_number into v_date, v_user, v_ref
    from public.sales where id = new.sale_id;

  insert into public.stock_movements (date, product_id, quantity_added, quantity_removed, reason, user_id, reference_number)
  values (v_date, new.product_id, 0, new.quantity, 'Sale', v_user, v_ref);

  return new;
end;
$$;

create trigger sale_item_stock_movement
  after insert on public.sale_items
  for each row execute function public.create_sale_stock_movement();

-- ---------- Activity logs ----------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  action text not null,
  date date not null default current_date,
  time text not null,
  ip_address text not null default ''
);

-- ---------- Company settings (single row) ----------
create table public.company_settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null default 'MW2000',
  company_logo_url text,
  support_email text not null default '',
  email_notifications_enabled boolean not null default true,
  currency text not null default 'PHP',
  tax_rate numeric(5, 2) not null default 0,
  address text not null default '',
  contact_numbers jsonb not null default '[]'::jsonb,
  contact_emails jsonb not null default '[]'::jsonb
);

insert into public.company_settings (id, company_name) values (1, 'MW2000');

-- =========================================================================
-- Row Level Security
-- =========================================================================

create function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.contracts enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.company_settings enable row level security;

-- profiles: everyone signed in can read all profiles (for rep/technician lookups);
-- admins manage roles, users may update their own basic info.
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update_self_or_admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles_delete_admin" on public.profiles for delete to authenticated
  using (public.is_admin());

-- suppliers / products: admin-only writes (matches inventory:add/edit/delete permission)
create policy "suppliers_select" on public.suppliers for select to authenticated using (true);
create policy "suppliers_write_admin" on public.suppliers for insert to authenticated with check (public.is_admin());
create policy "suppliers_update_admin" on public.suppliers for update to authenticated using (public.is_admin());
create policy "suppliers_delete_admin" on public.suppliers for delete to authenticated using (public.is_admin());

create policy "products_select" on public.products for select to authenticated using (true);
create policy "products_write_admin" on public.products for insert to authenticated with check (public.is_admin());
create policy "products_update_admin" on public.products for update to authenticated using (public.is_admin());
create policy "products_delete_admin" on public.products for delete to authenticated using (public.is_admin());

-- customers: staff + admin can add/edit, admin-only delete (matches customers:* permissions)
create policy "customers_select" on public.customers for select to authenticated using (true);
create policy "customers_write" on public.customers for insert to authenticated with check (true);
create policy "customers_update" on public.customers for update to authenticated using (true);
create policy "customers_delete_admin" on public.customers for delete to authenticated using (public.is_admin());

create policy "contracts_select" on public.contracts for select to authenticated using (true);
create policy "contracts_write" on public.contracts for insert to authenticated with check (true);
create policy "contracts_update_admin" on public.contracts for update to authenticated using (public.is_admin());
create policy "contracts_delete_admin" on public.contracts for delete to authenticated using (public.is_admin());

-- sales: staff + admin can add, admin-only edit/delete (matches sales:* permissions)
create policy "sales_select" on public.sales for select to authenticated using (true);
create policy "sales_write" on public.sales for insert to authenticated with check (true);
create policy "sales_update_admin" on public.sales for update to authenticated using (public.is_admin());
create policy "sales_delete_admin" on public.sales for delete to authenticated using (public.is_admin());

create policy "sale_items_select" on public.sale_items for select to authenticated using (true);
create policy "sale_items_write" on public.sale_items for insert to authenticated with check (true);
create policy "sale_items_update_admin" on public.sale_items for update to authenticated using (public.is_admin());
create policy "sale_items_delete_admin" on public.sale_items for delete to authenticated using (public.is_admin());

-- stock_movements: admin-only manual writes (the sale-item trigger runs as security definer, bypassing this)
create policy "stock_movements_select" on public.stock_movements for select to authenticated using (true);
create policy "stock_movements_write_admin" on public.stock_movements for insert to authenticated with check (public.is_admin());

-- notifications: readable by all signed-in users, updatable by all (mark-read)
create policy "notifications_select" on public.notifications for select to authenticated using (true);
create policy "notifications_update" on public.notifications for update to authenticated using (true);

-- activity_logs: readable/insertable by all signed-in users, matches prior "log every action" behavior
create policy "activity_logs_select" on public.activity_logs for select to authenticated using (true);
create policy "activity_logs_write" on public.activity_logs for insert to authenticated with check (true);

-- company_settings: everyone can read, admin-only update (matches settings:manage permission)
create policy "company_settings_select" on public.company_settings for select to authenticated using (true);
create policy "company_settings_update_admin" on public.company_settings for update to authenticated using (public.is_admin());
