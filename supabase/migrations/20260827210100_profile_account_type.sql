-- Store the user's marketplace account type in the existing profile source of truth.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

alter table public.profiles
  add column if not exists account_type text not null default 'Individual'
  check (account_type in ('Individual', 'Farmer', 'Seller', 'Business', 'Professional', 'Organization'));

grant update (account_type) on public.profiles to authenticated;
