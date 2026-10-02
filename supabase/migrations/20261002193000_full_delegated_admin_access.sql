-- Every delegated Admin added by the Owner Admin receives the complete Admin Control surface.
-- Keep the permissions column populated for transparency, while active membership is the
-- source of truth for all admin capabilities.

do $$
declare
  v_all_permissions text[] := array['listings','advertising','payments','verification','users','reports','support','businesses'];
begin
  update public.admin_team_members
     set permissions = v_all_permissions,
         updated_at = timezone('utc', now())
   where permissions is distinct from v_all_permissions;
end;
$$;

create or replace function private.has_admin_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_bese26_owner_admin()
    or exists (
      select 1
        from public.admin_team_members m
       where m.user_id = auth.uid()
         and m.active = true
    );
$$;

create or replace function private.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_bese26_owner_admin()
    or exists (
      select 1
        from public.admin_team_members m
       where m.user_id = auth.uid()
         and m.active = true
    );
$$;

create or replace function public.admin_team_add(p_email text, p_permissions text[])
returns public.admin_team_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row public.admin_team_members;
  v_email text := lower(trim(p_email));
  v_all_permissions text[] := array['listings','advertising','payments','verification','users','reports','support','businesses'];
begin
  if not private.is_bese26_owner_admin() then raise exception 'OWNER_ADMIN_REQUIRED'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'INVALID_ADMIN_EMAIL'; end if;
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  if v_user_id is null then raise exception 'ADMIN_EMAIL_MUST_REGISTER_FIRST'; end if;
  insert into public.admin_team_members(user_id, email, permissions, created_by)
  values (v_user_id, v_email, v_all_permissions, auth.uid())
  on conflict (user_id) do update
    set email = excluded.email,
        permissions = v_all_permissions,
        active = true,
        updated_at = timezone('utc', now())
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.admin_team_update(p_user_id uuid, p_permissions text[], p_active boolean)
returns public.admin_team_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.admin_team_members;
  v_all_permissions text[] := array['listings','advertising','payments','verification','users','reports','support','businesses'];
begin
  if not private.is_bese26_owner_admin() then raise exception 'OWNER_ADMIN_REQUIRED'; end if;
  if p_user_id = auth.uid() then raise exception 'OWNER_CANNOT_BE_DEACTIVATED'; end if;
  update public.admin_team_members
     set permissions = v_all_permissions,
         active = p_active,
         updated_at = timezone('utc', now())
   where user_id = p_user_id
  returning * into v_row;
  if v_row.id is null then raise exception 'ADMIN_NOT_FOUND'; end if;
  return v_row;
end;
$$;

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
    'permissions', case
      when private.is_bese26_owner_admin() then to_jsonb(array['listings','advertising','payments','verification','users','reports','support','businesses']::text[])
      when exists (select 1 from public.admin_team_members m where m.user_id = auth.uid() and m.active = true)
        then to_jsonb(array['listings','advertising','payments','verification','users','reports','support','businesses']::text[])
      else '[]'::jsonb
    end
  );
$$;

comment on function public.current_user_admin_access() is 'Returns full Admin Control access for the owner and every active delegated Admin.';
