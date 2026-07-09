-- Auto-generate invoice numbers, and restore the "new customer" / "new sale"
-- notification side-effects the mock store used to raise on every insert.

create sequence public.sale_invoice_seq start 1000;

create function public.set_sale_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || to_char(new.date, 'YYYYMM') || '-' || nextval('public.sale_invoice_seq')::text;
  end if;
  return new;
end;
$$;

create trigger set_invoice_number
  before insert on public.sales
  for each row execute function public.set_sale_invoice_number();

create function public.notify_new_sale()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (type, message, related_entity_id)
  values ('new-sale', 'New sale recorded: ' || new.invoice_number || '.', new.id::text);
  return new;
end;
$$;

create trigger sale_notification
  after insert on public.sales
  for each row execute function public.notify_new_sale();

create function public.notify_new_customer()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (type, message, related_entity_id)
  values ('new-customer', new.full_name || ' registered as a new customer.', new.id::text);
  return new;
end;
$$;

create trigger customer_notification
  after insert on public.customers
  for each row execute function public.notify_new_customer();
