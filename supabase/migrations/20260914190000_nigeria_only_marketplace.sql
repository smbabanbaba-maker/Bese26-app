-- Bese26 is a Nigeria-only marketplace.
-- Run this migration in the Supabase SQL Editor for the production project.

update public.profiles set country = 'Nigeria' where country is distinct from 'Nigeria';
update public.business_profiles set country = 'Nigeria' where country is distinct from 'Nigeria';
update public.listings set country = 'Nigeria', currency = 'NGN'
where country is distinct from 'Nigeria' or currency is distinct from 'NGN';
update public.profile_preferences set currency = 'NGN', number_format = 'en-NG'
where currency is distinct from 'NGN' or number_format is distinct from 'en-NG';

create or replace function public.enforce_bese26_nigeria_only()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'profiles' then
    new.country := 'Nigeria';
  elsif tg_table_name = 'business_profiles' then
    new.country := 'Nigeria';
  elsif tg_table_name = 'listings' then
    new.country := 'Nigeria';
    new.currency := 'NGN';
  elsif tg_table_name = 'profile_preferences' then
    new.currency := 'NGN';
    new.number_format := 'en-NG';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_nigeria_only on public.profiles;
create trigger profiles_nigeria_only
before insert or update on public.profiles
for each row execute function public.enforce_bese26_nigeria_only();

drop trigger if exists business_profiles_nigeria_only on public.business_profiles;
create trigger business_profiles_nigeria_only
before insert or update on public.business_profiles
for each row execute function public.enforce_bese26_nigeria_only();

drop trigger if exists listings_nigeria_only on public.listings;
create trigger listings_nigeria_only
before insert or update on public.listings
for each row execute function public.enforce_bese26_nigeria_only();

drop trigger if exists profile_preferences_nigeria_only on public.profile_preferences;
create trigger profile_preferences_nigeria_only
before insert or update on public.profile_preferences
for each row execute function public.enforce_bese26_nigeria_only();
