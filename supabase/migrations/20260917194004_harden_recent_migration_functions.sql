-- Harden functions introduced by the recent production migrations.
create or replace function public.enforce_bese26_nigeria_only()
returns trigger
language plpgsql
set search_path = public
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

revoke all on function public.notify_followers_on_listing_publish() from public, anon;
revoke all on function public.notify_on_new_follower() from public, anon;
revoke all on function public.notify_on_listing_saved() from public, anon;
revoke all on function public.enforce_bese26_owner_verified() from public, anon;

grant execute on function public.notify_followers_on_listing_publish() to authenticated;
grant execute on function public.notify_on_new_follower() to authenticated;
grant execute on function public.notify_on_listing_saved() to authenticated;
grant execute on function public.enforce_bese26_owner_verified() to authenticated;
