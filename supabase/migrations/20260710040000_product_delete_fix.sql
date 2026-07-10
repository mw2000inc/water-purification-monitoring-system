-- Deleting a product currently fails with a raw foreign-key error because both
-- stock_movements and sale_items reference it with no ON DELETE behavior (defaults
-- to NO ACTION/RESTRICT), and virtually every product accumulates stock movements
-- almost immediately. stock_movements is just the inventory ledger for that product,
-- so it's safe to cascade-delete along with it. sale_items is real sales/invoice
-- history and must never silently disappear — that FK stays RESTRICT, and the app
-- now catches the violation and shows a clear message instead of a raw error.
alter table public.stock_movements
  drop constraint stock_movements_product_id_fkey,
  add constraint stock_movements_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;
