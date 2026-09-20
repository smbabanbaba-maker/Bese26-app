-- Owner-level platform controls for Bese26.
-- Maintenance mode is a reversible soft switch; destructive account/store actions remain auditable.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.app_settings(key, value)
values ('platform', '{"maintenance_mode": false, "maintenance_message": "Bese26 is temporarily unavailable while we make improvements."}'::jsonb)
on conflict (key) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists app_settings_public_read on public.app_settings;
create policy app_settings_public_read on public.app_settings for select to anon, authenticated using (key = 'platform');
drop policy if exists app_settings_owner_write on public.app_settings;
create policy app_settings_owner_write on public.app_settings for all to authenticated using (private.is_bese26_owner_admin()) with check (private.is_bese26_owner_admin());

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
alter table public.admin_audit_logs enable row level security;
drop policy if exists admin_audit_logs_owner_read on public.admin_audit_logs;
create policy admin_audit_logs_owner_read on public.admin_audit_logs for select to authenticated using (private.is_bese26_owner_admin());

create or replace function public.admin_platform_settings()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not private.is_bese26_owner_admin() then raise exception 'OWNER_ADMIN_REQUIRED'; end if;
  return coalesce((select value from public.app_settings where key = 'platform'), '{}'::jsonb);
end; $$;

create or replace function public.admin_set_maintenance(p_enabled boolean, p_message text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_value jsonb;
begin
  if not private.is_bese26_owner_admin() then raise exception 'OWNER_ADMIN_REQUIRED'; end if;
  v_value = jsonb_build_object('maintenance_mode', p_enabled, 'maintenance_message', coalesce(nullif(trim(p_message), ''), 'Bese26 is temporarily unavailable while we make improvements.'));
  insert into public.app_settings(key, value, updated_by) values ('platform', v_value, auth.uid())
  on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = timezone('utc', now());
  insert into public.admin_audit_logs(actor_id, action, target_type, note, metadata) values (auth.uid(), case when p_enabled then 'maintenance_enabled' else 'maintenance_disabled' end, 'platform', p_message, v_value);
  return v_value;
end; $$;

create or replace function public.admin_soft_delete_business(p_business_profile_id uuid, p_reason text)
returns public.business_profiles language plpgsql security definer set search_path = public as $$
declare v_row public.business_profiles;
begin
  if not private.is_bese26_owner_admin() then raise exception 'OWNER_ADMIN_REQUIRED'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'AUDIT_REASON_REQUIRED'; end if;
  update public.business_profiles set is_active = false, updated_at = timezone('utc', now()), suspension_reason = trim(p_reason) where profile_id = p_business_profile_id returning * into v_row;
  if v_row.profile_id is null then raise exception 'BUSINESS_NOT_FOUND'; end if;
  insert into public.admin_audit_logs(actor_id, action, target_type, target_id, note) values (auth.uid(), 'business_soft_deleted', 'business_profile', p_business_profile_id, trim(p_reason));
  return v_row;
end; $$;

create or replace function public.admin_audit_list(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not private.is_bese26_owner_admin() then raise exception 'OWNER_ADMIN_REQUIRED'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id,actor_id,action,target_type,target_id,note,metadata,created_at from public.admin_audit_logs order by created_at desc limit greatest(1, least(p_limit, 200))) x), '[]'::jsonb);
end; $$;

revoke all on function public.admin_platform_settings() from public, anon;
revoke all on function public.admin_set_maintenance(boolean, text) from public, anon;
revoke all on function public.admin_soft_delete_business(uuid, text) from public, anon;
revoke all on function public.admin_audit_list(integer) from public, anon;
grant execute on function public.admin_platform_settings() to authenticated;
grant execute on function public.admin_set_maintenance(boolean, text) to authenticated;
grant execute on function public.admin_soft_delete_business(uuid, text) to authenticated;
grant execute on function public.admin_audit_list(integer) to authenticated;
grant select on public.app_settings to anon, authenticated;
