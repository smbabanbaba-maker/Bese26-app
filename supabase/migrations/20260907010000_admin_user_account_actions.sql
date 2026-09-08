-- Admin account safety actions: reversible suspension and audited hard deletion.
-- The authoritative owner admin account can never be suspended or deleted.
create or replace function public.admin_set_user_access(
  p_user_id uuid,
  p_suspended boolean,
  p_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row public.profiles;
  v_email text;
begin
  if not private.is_bese26_owner_admin() then
    raise exception 'Admin access required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own admin access';
  end if;
  select lower(email) into v_email from auth.users where id = p_user_id;
  if v_email = 'smbabanbaba@gmail.com' then
    raise exception 'The authoritative owner admin is protected';
  end if;
  if p_suspended and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required to suspend an account';
  end if;
  update public.profiles
     set admin_suspended = p_suspended,
         admin_suspension_reason = case when p_suspended then nullif(trim(p_reason), '') else null end,
         admin_suspended_at = case when p_suspended then timezone('utc', now()) else null end,
         admin_suspended_by = case when p_suspended then auth.uid() else null end,
         updated_at = timezone('utc', now())
   where id = p_user_id
   returning * into v_row;
  if v_row.id is null then
    raise exception 'User not found';
  end if;
  return v_row;
end;
$$;
revoke all on function public.admin_set_user_access(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_user_access(uuid, boolean, text) to authenticated;

create or replace function public.admin_delete_user(
  p_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  if not private.is_bese26_owner_admin() then
    raise exception 'Admin access required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own admin account';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required to delete an account';
  end if;
  select lower(email) into v_email from auth.users where id = p_user_id;
  if v_email is null then
    raise exception 'User not found';
  end if;
  if v_email = 'smbabanbaba@gmail.com' then
    raise exception 'The authoritative owner admin is protected';
  end if;
  -- Deleting auth.users invokes the existing foreign-key cleanup rules for this app.
  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;
revoke all on function public.admin_delete_user(uuid, text) from public, anon;
grant execute on function public.admin_delete_user(uuid, text) to authenticated;

comment on function public.admin_set_user_access(uuid, boolean, text) is 'Owner-admin-only reversible account suspension with required reason and owner protection.';
comment on function public.admin_delete_user(uuid, text) is 'Owner-admin-only permanent account deletion with required reason and owner protection.';
