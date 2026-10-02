-- Expand Admin Audit Logs into a reliable, server-side activity trail.
-- Any authenticated owner or active delegated admin can review it; writes are created
-- by database triggers so the browser cannot silently skip an action.

create or replace function private.log_admin_table_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_target uuid;
  v_target_type text := TG_TABLE_NAME;
  v_operation text := lower(TG_OP);
begin
  if v_actor is null or not private.is_admin() then
    return coalesce(NEW, OLD);
  end if;

  v_target := case
    when TG_OP = 'DELETE' then coalesce((to_jsonb(OLD)->>'id')::uuid, (to_jsonb(OLD)->>'profile_id')::uuid, (to_jsonb(OLD)->>'user_id')::uuid)
    else coalesce((to_jsonb(NEW)->>'id')::uuid, (to_jsonb(NEW)->>'profile_id')::uuid, (to_jsonb(NEW)->>'user_id')::uuid)
  end;

  insert into public.admin_audit_logs(actor_id, action, target_type, target_id, note, metadata)
  values (
    v_actor,
    'admin_' || v_operation,
    v_target_type,
    v_target,
    initcap(v_operation || ' ' || replace(v_target_type, '_', ' ')),
    jsonb_build_object('source', 'database_trigger', 'operation', TG_OP, 'table', TG_TABLE_NAME)
  );
  return coalesce(NEW, OLD);
exception when others then
  -- Never make the protected admin action fail only because audit metadata failed.
  return coalesce(NEW, OLD);
end;
$$;

-- Recreate triggers idempotently across the primary admin-controlled data surfaces.
do $$
declare
  v_table text;
  v_tables text[] := array[
    'listings', 'profiles', 'verification_applications', 'business_verification_applications',
    'business_profiles', 'user_reports', 'listing_reports', 'support_tickets',
    'ad_campaigns', 'admin_team_members', 'app_settings'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop trigger if exists admin_audit_%s on public.%I', v_table, v_table);
      execute format('create trigger admin_audit_%s after insert or update or delete on public.%I for each row execute function private.log_admin_table_change()', v_table, v_table);
    end if;
  end loop;
end;
$$;

create or replace function public.admin_audit_list(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not private.is_admin() then raise exception 'ADMIN_ACCESS_REQUIRED'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select l.id, l.actor_id, coalesce(p.display_name, p.username, 'Bese26 admin') as actor_name,
               p.username as actor_username, au.email as actor_email,
               l.action, l.target_type, l.target_id, l.note, l.metadata, l.created_at
          from public.admin_audit_logs l
          left join public.profiles p on p.id = l.actor_id
          left join auth.users au on au.id = l.actor_id
         order by l.created_at desc
         limit greatest(1, least(coalesce(p_limit, 100), 300))
      ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_audit_list(integer) from public, anon;
grant execute on function public.admin_audit_list(integer) to authenticated;
grant execute on function private.log_admin_table_change() to authenticated;

comment on table public.admin_audit_logs is 'Server-generated activity trail for owner and delegated Bese26 admins.';
comment on function public.admin_audit_list(integer) is 'Returns recent server-generated Admin Audit Logs with actor identity.';
