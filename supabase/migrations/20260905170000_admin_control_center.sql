-- Bese26: central admin control center. All privileged operations are gated
-- server-side; the browser never receives service-role credentials.
alter table public.profiles add column if not exists admin_suspended boolean not null default false;
alter table public.profiles add column if not exists admin_suspension_reason text;
alter table public.profiles add column if not exists admin_suspended_at timestamptz;
alter table public.profiles add column if not exists admin_suspended_by uuid references public.profiles(id) on delete set null;

create or replace function public.admin_control_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
    'counts', jsonb_build_object(
      'users', (select count(*) from public.profiles),
      'suspended_users', (select count(*) from public.profiles where admin_suspended),
      'businesses', (select count(*) from public.business_profiles),
      'active_businesses', (select count(*) from public.business_profiles where is_active),
      'pending_listings', (select count(*) from public.listings where status = 'pending' and moderation_status = 'pending'),
      'live_listings', (select count(*) from public.listings where status = 'active' and moderation_status = 'approved'),
      'open_reports', (select count(*) from public.user_reports where status in ('open','reviewing')),
      'listing_reports', (select count(*) from public.listing_reports where status = 'pending'),
      'open_support', (select count(*) from public.support_tickets where status in ('open','in_progress','waiting_user')),
      'active_ads', (select count(*) from public.ad_campaigns where status = 'active' and starts_at <= now() and (ends_at is null or ends_at > now()))
    ),
    'recent_users', coalesce((select jsonb_agg(to_jsonb(u) order by u.created_at desc) from (select id,username,display_name,account_type,app_role,is_verified,admin_suspended,created_at from public.profiles order by created_at desc limit 12) u), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (select r.id,r.target_type,r.target_id,r.reason,r.description,r.status,r.created_at,p.display_name as reporter_name from public.user_reports r left join public.profiles p on p.id=r.reporter_id where r.status in ('open','reviewing') order by r.created_at desc limit 30) r), '[]'::jsonb),
    'listing_reports', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (select r.id,r.listing_id,r.reason,r.details,r.status,r.created_at,l.title,p.display_name as reporter_name from public.listing_reports r left join public.listings l on l.id=r.listing_id left join public.profiles p on p.id=r.reporter_id where r.status = 'pending' order by r.created_at desc limit 30) r), '[]'::jsonb),
    'support', coalesce((select jsonb_agg(to_jsonb(t) order by t.updated_at desc) from (select t.id,t.ticket_number,t.email,t.subject,t.category,t.message,t.status,t.priority,t.created_at,t.updated_at,p.display_name as user_name from public.support_tickets t left join public.profiles p on p.id=t.user_id where t.status in ('open','in_progress','waiting_user') order by t.updated_at desc limit 30) t), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.admin_control_overview() from public, anon;
grant execute on function public.admin_control_overview() to authenticated;

create or replace function public.admin_update_report(p_report_id uuid, p_status text)
returns public.user_reports
language plpgsql security definer set search_path = public as $$
declare v_row public.user_reports;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('open','reviewing','resolved','dismissed') then raise exception 'Invalid report status'; end if;
  update public.user_reports set status=p_status, updated_at=timezone('utc',now()) where id=p_report_id returning * into v_row;
  if v_row.id is null then raise exception 'Report not found'; end if;
  return v_row;
end; $$;
revoke all on function public.admin_update_report(uuid,text) from public, anon;
grant execute on function public.admin_update_report(uuid,text) to authenticated;

create or replace function public.admin_update_listing_report(p_report_id uuid, p_status text)
returns public.listing_reports
language plpgsql security definer set search_path = public as $$
declare v_row public.listing_reports;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('pending','reviewed','resolved','dismissed') then raise exception 'Invalid listing report status'; end if;
  update public.listing_reports set status=p_status, updated_at=timezone('utc',now()) where id=p_report_id returning * into v_row;
  if v_row.id is null then raise exception 'Listing report not found'; end if;
  return v_row;
end; $$;
revoke all on function public.admin_update_listing_report(uuid,text) from public, anon;
grant execute on function public.admin_update_listing_report(uuid,text) to authenticated;

create or replace function public.admin_update_support_ticket(p_ticket_id uuid, p_status text, p_priority text default null)
returns public.support_tickets
language plpgsql security definer set search_path = public as $$
declare v_row public.support_tickets;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('open','in_progress','waiting_user','resolved','closed') then raise exception 'Invalid support status'; end if;
  if p_priority is not null and p_priority not in ('low','normal','high','urgent') then raise exception 'Invalid support priority'; end if;
  update public.support_tickets set status=p_status, priority=coalesce(p_priority,priority), updated_at=timezone('utc',now()) where id=p_ticket_id returning * into v_row;
  if v_row.id is null then raise exception 'Support ticket not found'; end if;
  return v_row;
end; $$;
revoke all on function public.admin_update_support_ticket(uuid,text,text) from public, anon;
grant execute on function public.admin_update_support_ticket(uuid,text,text) to authenticated;

create or replace function public.admin_set_user_access(p_user_id uuid, p_suspended boolean, p_reason text default null)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v_row public.profiles;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot suspend your own admin account'; end if;
  update public.profiles set admin_suspended=p_suspended, admin_suspension_reason=case when p_suspended then nullif(trim(p_reason),'') else null end, admin_suspended_at=case when p_suspended then timezone('utc',now()) else null end, admin_suspended_by=case when p_suspended then auth.uid() else null end where id=p_user_id returning * into v_row;
  if v_row.id is null then raise exception 'User not found'; end if;
  return v_row;
end; $$;
revoke all on function public.admin_set_user_access(uuid,boolean,text) from public, anon;
grant execute on function public.admin_set_user_access(uuid,boolean,text) to authenticated;

create or replace function public.admin_set_business_visibility(p_profile_id uuid, p_is_active boolean)
returns public.business_profiles
language plpgsql security definer set search_path = public as $$
declare v_row public.business_profiles;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  update public.business_profiles set is_active=p_is_active, updated_at=timezone('utc',now()) where profile_id=p_profile_id returning * into v_row;
  if v_row.profile_id is null then raise exception 'Business not found'; end if;
  return v_row;
end; $$;
revoke all on function public.admin_set_business_visibility(uuid,boolean) from public, anon;
grant execute on function public.admin_set_business_visibility(uuid,boolean) to authenticated;

comment on function public.admin_control_overview() is 'Admin-only dashboard metrics and operational queues for Bese26.';
