-- The customer portal (/portal/[id]) is reached by scanning a QR code and is
-- explicitly advertised as "no login required" (see customer-qr-dialog.tsx) — but
-- every RLS policy on customers/sales/company_settings requires `to authenticated`,
-- so an anonymous visitor's query always returns zero rows regardless of whether the
-- id is valid. That's the actual cause of "We couldn't find this profile".
--
-- The fix is NOT to open broad anonymous SELECT on these tables — sales/customers
-- contain every other customer's data too, and an anon key is public. Instead this
-- function returns only the one customer's own profile, their own sales, and just
-- the product names referenced by those sales, as a single security-definer RPC.
create or replace function public.get_portal_profile(p_customer_id uuid)
returns json
language plpgsql
security definer set search_path = public
stable
as $$
declare
  result json;
begin
  select json_build_object(
    'customer', (
      select row_to_json(c) from (
        select id, order_number, full_name, company_name, contract_number, contract_start,
               contract_end, address, email, contact_number, dispenser_type, filter_installed,
               assigned_technician
        from public.customers where id = p_customer_id
      ) c
    ),
    'sales', (
      select coalesce(json_agg(row_to_json(s)), '[]'::json) from (
        select s.id, s.invoice_number, s.date, s.payment_method, s.payment_status, s.total_amount,
               (select coalesce(json_agg(json_build_object('productId', si.product_id, 'quantity', si.quantity)), '[]'::json)
                from public.sale_items si where si.sale_id = s.id) as items
        from public.sales s where s.customer_id = p_customer_id
      ) s
    ),
    'products', (
      select coalesce(json_agg(json_build_object('id', p.id, 'name', p.name)), '[]'::json)
      from public.products p
      where p.id in (
        select si.product_id from public.sale_items si
        join public.sales s on s.id = si.sale_id
        where s.customer_id = p_customer_id
      )
    ),
    'settings', (
      select row_to_json(cs) from (
        select company_name, address, contact_numbers, contact_emails from public.company_settings where id = 1
      ) cs
    )
  ) into result;
  return result;
end;
$$;

grant execute on function public.get_portal_profile(uuid) to anon, authenticated;
