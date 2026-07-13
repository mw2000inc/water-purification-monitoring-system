-- Shopify OAuth connection state + order-webhook support.
--
-- shopify_settings stores the permanent access token. It intentionally gets
-- RLS enabled with ZERO policies granted to anon/authenticated — this makes
-- every row completely invisible to the browser client (anon key) and to
-- normal authenticated sessions, no matter their role. Only a service-role
-- client (which bypasses RLS entirely) can read or write it, and that client
-- is only ever constructed server-side (src/lib/supabase/admin.ts, guarded
-- by "server-only"). This is deliberately tighter than every other table in
-- this schema, since a leaked access token would grant full API access to
-- the connected Shopify store.
create table public.shopify_settings (
  id integer primary key default 1 check (id = 1),
  shop_domain text,
  scopes text,
  access_token text,
  installed_at timestamptz,
  -- The customer/sales-rep every Shopify-origin sale is attributed to.
  -- system_profile_id is simply whichever admin performed the OAuth install
  -- (captured from their own session in the callback) — no separate
  -- machine/service auth account is created for this.
  system_customer_id uuid references public.customers(id),
  system_profile_id uuid references public.profiles(id)
);

insert into public.shopify_settings (id) values (1)
on conflict (id) do nothing;

alter table public.shopify_settings enable row level security;
-- No policies created on purpose — see comment above.

-- Marks rows that exist for bookkeeping (e.g. the placeholder "Shopify
-- Storefront" customer below) rather than a real water-purifier install
-- contract. The app filters these out of Customers/Contracts/Dashboard
-- views so they don't show up as a fake quarterly-maintenance contract.
alter table public.customers add column is_system boolean not null default false;

-- Idempotency key for the order webhook: Shopify's webhook delivery is
-- "at least once", so retries/redeliveries are expected. Checking this
-- column before inserting a Sale prevents double-counting an order.
alter table public.sales add column shopify_order_id text unique;

-- One placeholder customer that every Shopify-origin Sale is billed to.
-- Real contract fields (dates, dispenser type, technician) are meaningless
-- here since this isn't an installed water-purifier unit — they're filled
-- with inert placeholders and the row is excluded from contract tracking
-- via is_system.
insert into public.customers (
  full_name, company_name, address, email, contact_number,
  dispenser_type, filter_installed, assigned_technician,
  contract_start, contract_end, is_system, notes
)
select
  'Shopify Storefront', 'Online Orders', 'Online (Shopify)', 'orders@shopify.local', 'N/A',
  'N/A', false, 'N/A',
  current_date, current_date, true,
  'Auto-created placeholder customer that Shopify webhook orders are billed to. Do not use for real installs.'
where not exists (select 1 from public.customers where is_system = true);

update public.shopify_settings
set system_customer_id = (select id from public.customers where is_system = true limit 1)
where id = 1;
