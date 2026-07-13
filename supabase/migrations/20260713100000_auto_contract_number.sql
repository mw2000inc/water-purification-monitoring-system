-- Contract Number is no longer entered manually on the Add/Edit Customer form —
-- auto-fill it the same way order_number is generated, reusing that same value,
-- so the column (still required elsewhere, e.g. the contracts table sync trigger)
-- always has something meaningful without asking the user for it.
create or replace function public.set_customer_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'SK001-' || lpad(nextval('public.customer_order_seq')::text, 4, '0');
  end if;
  if new.contract_number is null or new.contract_number = '' then
    new.contract_number := new.order_number;
  end if;
  return new;
end;
$$;
