-- Business verification requires an active Business subscription.
-- A verified business keeps its decision, but its public verification badge is
-- automatically disabled when the subscription period ends. Renewal restores
-- the badge only when the latest moderation decision is still verified.

alter table public.business_profiles
  drop constraint if exists business_profiles_verification_status_check;
alter table public.business_profiles
  add constraint business_profiles_verification_status_check
  check (verification_status in ('not_started','draft','pending_review','under_review','verified','requires_more_information','rejected','suspended','subscription_expired'));

alter table public.business_profiles
  add column if not exists verification_expires_at timestamptz,
  add column if not exists verification_plan_key text;

alter table public.business_profiles
  drop constraint if exists business_profiles_verification_plan_key_check;
alter table public.business_profiles
  add constraint business_profiles_verification_plan_key_check
  check (verification_plan_key is null or verification_plan_key in ('business'));

create index if not exists business_profiles_verification_expiry_idx
  on public.business_profiles (verification_expires_at)
  where is_verified = true and verification_expires_at is not null;

create or replace function public.sync_business_verification_entitlements()
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_changed integer := 0;
begin
  -- Expire only badges that were granted with a subscription end date.
  -- The moderation application remains verified, so a renewed plan can restore
  -- the badge without silently creating a new approval decision.
  with expired as (
    update public.business_profiles b
       set is_verified = false,
           verification_status = 'subscription_expired',
           updated_at = timezone('utc', now())
     where b.is_verified = true
       and b.verification_expires_at is not null
       and b.verification_expires_at <= timezone('utc', now())
     returning b.profile_id, b.business_name
  )
  select count(*)::integer into v_changed from expired;

  -- A renewal restores a previously subscription-expired badge only when the
  -- latest business moderation application is still verified.
  with renewed as (
    update public.business_profiles b
       set is_verified = true,
           verification_status = 'verified',
           verified_at = coalesce(b.verified_at, timezone('utc', now())),
           verification_expires_at = s.current_period_end,
           verification_plan_key = s.plan_key,
           updated_at = timezone('utc', now())
      from public.seller_subscriptions s
     where b.profile_id = s.profile_id
       and b.verification_status = 'subscription_expired'
       and s.plan_key = 'business'
       and s.status = 'active'
       and (s.current_period_end is null or s.current_period_end > timezone('utc', now()))
       and exists (
         select 1
           from public.verification_applications a
          where a.user_id = b.profile_id
            and a.verification_type = 'business'
            and a.status = 'verified'
       )
     returning b.profile_id
  )
  select v_changed + count(*)::integer into v_changed from renewed;

  return v_changed;
end;
$$;

revoke all on function public.sync_business_verification_entitlements() from public, anon;
grant execute on function public.sync_business_verification_entitlements() to authenticated;

create or replace function public.sync_business_verification_on_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform public.sync_business_verification_entitlements();
  return new;
end;
$$;

revoke all on function public.sync_business_verification_on_subscription_change() from public, anon;

drop trigger if exists seller_subscription_verification_sync on public.seller_subscriptions;
create trigger seller_subscription_verification_sync
after insert or update of plan_key, status, current_period_end
on public.seller_subscriptions
for each row execute function public.sync_business_verification_on_subscription_change();

-- Replace the moderation approval RPC so a business cannot receive a verified
-- badge without an active Business subscription.
create or replace function public.review_business_verification(
  p_application_id uuid,
  p_status text,
  p_reviewer_note text default null
)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row public.verification_applications;
  v_business public.business_profiles;
  v_plan public.seller_subscriptions;
  v_note text := nullif(trim(coalesce(p_reviewer_note, '')), '');
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information','suspended') then raise exception 'INVALID_BUSINESS_REVIEW_STATUS'; end if;
  select * into v_row from public.verification_applications where id = p_application_id and verification_type = 'business' for update;
  if v_row.id is null then raise exception 'BUSINESS_APPLICATION_NOT_FOUND'; end if;

  if p_status = 'verified' then
    select * into v_plan
      from public.seller_subscriptions
     where profile_id = v_row.user_id
     for update;
    if v_plan.profile_id is null
       or v_plan.plan_key <> 'business'
       or v_plan.status <> 'active'
       or (v_plan.current_period_end is not null and v_plan.current_period_end <= timezone('utc', now())) then
      raise exception 'ACTIVE_BUSINESS_SUBSCRIPTION_REQUIRED';
    end if;
  end if;

  update public.verification_applications
     set status = case when p_status = 'verified' then 'verified' else p_status end,
         reviewer_note = v_note,
         reviewed_by = auth.uid(),
         reviewed_at = timezone('utc', now()),
         verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
         updated_at = timezone('utc', now())
   where id = v_row.id
   returning * into v_row;

  update public.business_profiles
     set verification_status = v_row.status,
         is_verified = (p_status = 'verified'),
         verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
         verification_expires_at = case when p_status = 'verified' then v_plan.current_period_end else null end,
         verification_plan_key = case when p_status = 'verified' then v_plan.plan_key else null end,
         suspended_at = case when p_status = 'suspended' then timezone('utc', now()) else null end,
         suspension_reason = case when p_status = 'suspended' then v_note else null end,
         updated_at = timezone('utc', now())
   where profile_id = v_row.user_id
   returning * into v_business;

  insert into public.business_verification_events (application_id, business_profile_id, actor_id, event_type, from_status, to_status, note)
  values (v_row.id, v_business.profile_id, auth.uid(), p_status, null, v_row.status, v_note);
  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (v_row.user_id, auth.uid(), 'business_verification_reviewed', case when p_status = 'verified' then 'Business verified' else 'Business verification updated' end, coalesce(v_note, 'Your business verification status was updated.'), jsonb_build_object('business_profile_id', v_business.profile_id, 'status', v_row.status));
  return v_row;
end;
$$;

revoke all on function public.review_business_verification(uuid,text,text) from public, anon;
grant execute on function public.review_business_verification(uuid,text,text) to authenticated;

-- Backfill verified businesses with the current paid period, then remove badges
-- whose plan is already inactive or expired.
update public.business_profiles b
   set verification_expires_at = s.current_period_end,
       verification_plan_key = s.plan_key,
       updated_at = timezone('utc', now())
  from public.seller_subscriptions s
 where b.profile_id = s.profile_id
   and b.is_verified = true
   and s.plan_key = 'business'
   and s.status = 'active';

select public.sync_business_verification_entitlements();

-- Supabase projects commonly expose pg_cron. Keep the migration safe on projects
-- where the extension is not enabled; the subscription trigger and the explicit
-- sync function still enforce the rule whenever subscription data changes.
do $$
begin
  begin
    execute 'create extension if not exists pg_cron with schema extensions';
  exception when others then
    null;
  end;
  if to_regnamespace('cron') is not null then
    begin
      perform cron.unschedule(jobid)
        from cron.job
       where jobname = 'bese26-sync-business-verification';
    exception when others then
      null;
    end;
    begin
      perform cron.schedule(
        'bese26-sync-business-verification',
        '*/15 * * * *',
        'select public.sync_business_verification_entitlements();'
      );
    exception when others then
      null;
    end;
  end if;
end;
$$;

comment on column public.business_profiles.verification_expires_at is 'Business verification badge expiry tied to the active Business subscription period.';
comment on column public.business_profiles.verification_plan_key is 'Subscription plan that supported the current business verification badge.';
comment on function public.sync_business_verification_entitlements() is 'Expires subscription-backed business verification and restores it after an eligible renewal.';
