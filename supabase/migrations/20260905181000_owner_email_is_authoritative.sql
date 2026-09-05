-- The approved owner email is authoritative. A role label is not required for access.
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
    left join public.profiles p on p.id = u.id
    where u.id = auth.uid()
      and lower(coalesce(u.email, '')) = 'smbabanbaba@gmail.com'
      and coalesce(p.admin_suspended, false) = false
  );
$$;
revoke all on function private.is_bese26_owner_admin() from public, anon;
grant execute on function private.is_bese26_owner_admin() to authenticated;
