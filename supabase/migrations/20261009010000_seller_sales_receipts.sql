-- Seller-recorded sales only. Bese26 does not process or verify payment.
create table if not exists public.seller_sales_receipts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  receipt_number text not null,
  customer_name text not null default 'Customer',
  customer_contact text,
  item_title text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_amount numeric(14,2) not null default 0 check (unit_amount >= 0),
  total_amount numeric(14,2) generated always as (quantity * unit_amount) stored,
  currency text not null default 'NGN',
  payment_method text not null default 'Cash',
  payment_status text not null default 'Paid' check (payment_status in ('Paid','Pending','Refunded','Cancelled')),
  sale_date date not null default current_date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (seller_id, receipt_number)
);
create index if not exists seller_sales_receipts_seller_date_idx on public.seller_sales_receipts(seller_id, sale_date desc);
alter table public.seller_sales_receipts enable row level security;
drop policy if exists "Sellers can read own sales receipts" on public.seller_sales_receipts;
create policy "Sellers can read own sales receipts" on public.seller_sales_receipts for select using (auth.uid() = seller_id);
drop policy if exists "Sellers can create own sales receipts" on public.seller_sales_receipts;
create policy "Sellers can create own sales receipts" on public.seller_sales_receipts for insert with check (auth.uid() = seller_id);
drop policy if exists "Sellers can update own sales receipts" on public.seller_sales_receipts;
create policy "Sellers can update own sales receipts" on public.seller_sales_receipts for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
drop policy if exists "Sellers can delete own sales receipts" on public.seller_sales_receipts;
create policy "Sellers can delete own sales receipts" on public.seller_sales_receipts for delete using (auth.uid() = seller_id);
