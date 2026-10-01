-- Expose the signed-in user's admin access so the client can show the control center
-- to delegated admins without trusting client-provided role data.
create or replace function public.current_user_admin_access()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'is_admin', private.is_admin(),
    'is_owner', private.is_bese26_owner_admin(),
    'permissions', coalesce(
      (select to_jsonb(m.permissions) from public.admin_team_members m where m.user_id = auth.uid() and m.active = true limit 1),
      '[]'::jsonb
    )
  );
$$;
revoke all on function public.current_user_admin_access() from public, anon;
grant execute on function public.current_user_admin_access() to authenticated;
