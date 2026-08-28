-- Paystack payment ledger for Bese26 subscriptions.
-- Writes are server-only; authenticated users can read their own rows.

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_key text not null check (plan_key in ('premium', 'business')),
  reference text not null unique,
  amount_kobo integer not null check (amount_kobo > 0),
  currency text not null default 'NGN',
  provider text not null default 'paystack',
  status text not null default 'initialized' check (status in ('initialized', 'successful', 'failed', 'abandoned', 'reversed', 'refunded')),
  paystack_transaction_id bigint,
  provider_customer_id text,
  provider_subscription_id text,
  event_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_transactions_user_idx on public.payment_transactions (user_id, created_at desc);
create index if not exists payment_transactions_status_idx on public.payment_transactions (status, updated_at desc);

alter table public.payment_transactions enable row level security;

drop policy if exists payment_transactions_owner_read on public.payment_transactions;
create policy payment_transactions_owner_read on public.payment_transactions
  for select to authenticated using (user_id = auth.uid());

grant select on public.payment_transactions to authenticated;
revoke insert, update, delete on public.payment_transactions from anon, authenticated;

drop trigger if exists payment_transactions_updated_at on public.payment_transactions;
create trigger payment_transactions_updated_at before update on public.payment_transactions for each row execute procedure private.set_updated_at();
