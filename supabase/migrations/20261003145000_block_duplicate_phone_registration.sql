-- Give signup a clear duplicate-phone check before auth.users is created.
-- The database trigger remains the final race-safe protection.

create or replace function public.phone_is_registered(p_phone text)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1
      from public.profile_contacts pc
     where private.normalize_login_phone(pc.phone) = private.normalize_login_phone(p_phone)
  );
$$;

revoke all on function public.phone_is_registered(text) from public;
grant execute on function public.phone_is_registered(text) to anon, authenticated;
