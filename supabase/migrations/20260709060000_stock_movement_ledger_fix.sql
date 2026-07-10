-- Fix stock movement ordering: `date` alone (day granularity, no tiebreaker) made
-- same-day movements come back from Postgres in an arbitrary order, so the client's
-- per-row running-balance reconstruction could scramble which row shows which
-- balance. `created_at` gives a real, unambiguous chronological order.
alter table public.stock_movements
  add column created_at timestamptz not null default now();

-- Second-hand stock is tracked separately from the regular ("brand new") quantity
-- that already lives on products.stock_quantity — it never adjusts that column,
-- it's purely an additional running total shown alongside it in the ledger.
alter table public.stock_movements
  add column second_hand_quantity integer not null default 0;
