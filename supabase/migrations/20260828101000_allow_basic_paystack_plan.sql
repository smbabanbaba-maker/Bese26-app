-- Allow the launch Basic plan in the Paystack payment ledger.
alter table public.payment_transactions drop constraint if exists payment_transactions_plan_key_check;
alter table public.payment_transactions add constraint payment_transactions_plan_key_check check (plan_key in ('basic', 'premium', 'business'));
