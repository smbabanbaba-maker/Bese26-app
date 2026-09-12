-- Allow each seller to choose the currency used for their listings.
-- Existing NGN profiles and listings remain unchanged.
alter table public.profile_preferences
  drop constraint if exists profile_preferences_currency_check;

alter table public.profile_preferences
  alter column currency set default 'NGN';

alter table public.profile_preferences
  add constraint profile_preferences_currency_check
  check (currency is null or currency ~ '^[A-Z]{3}$');

alter table public.listings
  drop constraint if exists listings_currency_check;

alter table public.listings
  add constraint listings_currency_check
  check (currency is null or currency ~ '^[A-Z]{3}$');
