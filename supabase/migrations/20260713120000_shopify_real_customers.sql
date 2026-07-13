-- Shopify orders now create/match a real customer per buyer instead of
-- always billing to the single generic "Shopify Storefront" placeholder.
--
-- shopify_customer_id is the stable dedupe key: Shopify's own customer id,
-- which stays the same across that buyer's repeat orders even if they
-- change their email later. Nullable + unique — null for guest checkouts
-- where Shopify has no customer account to key off of (those fall back to
-- matching by email in application code instead).
alter table public.customers add column shopify_customer_id text unique;

-- Distinguishes a REAL per-buyer customer created from a Shopify order (has
-- an actual name/email/phone, should show normally in Customers/Sales/
-- Dashboard) from is_system (the one generic bookkeeping placeholder, which
-- stays hidden everywhere). Both flags are excluded from Contracts/Quarterly
-- Monitoring — neither has an installed unit with a real maintenance cycle —
-- but only is_system is hidden from the Customers list itself.
alter table public.customers add column is_shopify_customer boolean not null default false;
