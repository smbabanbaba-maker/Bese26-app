create or replace function public.admin_users_directory()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(to_jsonb(u) order by u.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select id, username, display_name, account_type, app_role, is_verified, admin_suspended, created_at
    from public.profiles
    order by created_at desc
    limit 1000
  ) u;
  return v_result;
end;
$$;
revoke all on function public.admin_users_directory() from public, anon;
grant execute on function public.admin_users_directory() to authenticated;
