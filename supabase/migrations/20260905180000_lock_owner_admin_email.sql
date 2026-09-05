-- Bese26 owner-admin lock: only this verified auth email may use admin controls.
-- Role labels remain useful for display, but privileged checks are email-bound.
update public.profiles as p
set app_role = 'user'
from auth.users as u
where p.id = u.id
  and p.app_role = 'admin'
  and lower(coalesce(u.email, '')) <> 'smbabanbaba@gmail.com';

create or replace function private.is_bese26_owner_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = auth.uid()
      and lower(coalesce(u.email, '')) = 'smbabanbaba@gmail.com'
      and p.app_role = 'admin'
      and coalesce(p.admin_suspended, false) = false
  );
$$;
revoke all on function private.is_bese26_owner_admin() from public, anon;
grant execute on function private.is_bese26_owner_admin() to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_bese26_owner_admin();
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create or replace function private.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_bese26_owner_admin();
$$;
revoke all on function private.is_moderator_or_admin() from public, anon;
grant execute on function private.is_moderator_or_admin() to authenticated;

create or replace function public.current_user_can_moderate()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select private.is_bese26_owner_admin();
$$;
revoke all on function public.current_user_can_moderate() from public, anon;
grant execute on function public.current_user_can_moderate() to authenticated;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select private.is_bese26_owner_admin();
$$;
revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;

comment on function private.is_bese26_owner_admin() is 'Only smbabanbaba@gmail.com is authorized as the Bese26 owner administrator.';
