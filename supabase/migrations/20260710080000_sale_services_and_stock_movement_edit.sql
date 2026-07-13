-- ---------- Sale services (Installation/Delivery, etc.) ----------
-- Mirrors sale_items but has no product_id — services aren't inventory and never
-- trigger a stock movement. Counts toward the sale's gross/discount/total the same
-- way product line items do (computed in the app, stored on sales.total_amount).
create table public.sale_services (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  name text not null,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  subtotal numeric(12, 2) not null
);

alter table public.sale_services enable row level security;

create policy "sale_services_select" on public.sale_services for select to authenticated using (true);
create policy "sale_services_write" on public.sale_services for insert to authenticated with check (true);
create policy "sale_services_update_admin" on public.sale_services for update to authenticated using (public.is_admin());
create policy "sale_services_delete_admin" on public.sale_services for delete to authenticated using (public.is_admin());

-- ---------- Stock movements: allow editing/removing a manual entry ----------
-- apply_stock_movement only runs on INSERT, so editing or deleting a movement never
-- touched products.stock_quantity — these keep it in sync with the ledger.
create function public.apply_stock_movement_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_qty integer;
  v_min integer;
  v_name text;
  v_delta integer;
begin
  v_delta := (new.quantity_added - new.quantity_removed) - (old.quantity_added - old.quantity_removed);

  update public.products
    set stock_quantity = stock_quantity + v_delta,
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

create trigger stock_movement_updated
  after update on public.stock_movements
  for each row
  when (
    old.quantity_added is distinct from new.quantity_added
    or old.quantity_removed is distinct from new.quantity_removed
  )
  execute function public.apply_stock_movement_update();

create function public.reverse_stock_movement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.products
    set stock_quantity = stock_quantity - (old.quantity_added - old.quantity_removed)
    where id = old.product_id;
  return old;
end;
$$;

create trigger stock_movement_deleted
  after delete on public.stock_movements
  for each row execute function public.reverse_stock_movement();

-- Manual entries were already admin-only to insert; editing/removing them matches.
create policy "stock_movements_update_admin" on public.stock_movements for update to authenticated using (public.is_admin());
create policy "stock_movements_delete_admin" on public.stock_movements for delete to authenticated using (public.is_admin());
