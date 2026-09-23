-- Identity verification requires an active Premium or Business plan.
-- The moderation decision remains stored, but the public badge follows the paid period.

create or replace function public.sync_identity_verification_entitlements()
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_changed integer := 0;
begin
  with expired as (
    update public.profiles p
       set is_verified = false,
           verification_expires_at = least(coalesce(p.verification_expires_at, timezone('utc', now())), timezone('utc', now())),
           updated_at = timezone('utc', now())
     where p.is_verified = true
       and p.verification_expires_at is not null
       and p.verification_expires_at <= timezone('utc', now())
    returning p.id
  )
  select count(*)::integer into v_changed from expired;

  with renewed as (
    update public.profiles p
       set is_verified = true,
           verification_expires_at = s.current_period_end,
           updated_at = timezone('utc', now())
      from public.seller_subscriptions s
     where p.id = s.profile_id
       and p.is_verified = false
       and s.plan_key in ('premium', 'business')
       and s.status = 'active'
       and (s.current_period_end is null or s.current_period_end > timezone('utc', now()))
       and exists (
         select 1 from public.verification_applications a
          where a.user_id = p.id
            and a.verification_type = 'identity'
            and a.status in ('verified', 'approved')
       )
    returning p.id
  )
  select v_changed + count(*)::integer into v_changed from renewed;

  return v_changed;
end;
$$;

revoke all on function public.sync_identity_verification_entitlements() from public, anon;
grant execute on function public.sync_identity_verification_entitlements() to authenticated;

create or replace function public.sync_identity_verification_on_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform public.sync_identity_verification_entitlements();
  return new;
end;
$$;

revoke all on function public.sync_identity_verification_on_subscription_change() from public, anon, authenticated;

drop trigger if exists seller_subscription_identity_verification_sync on public.seller_subscriptions;
create trigger seller_subscription_identity_verification_sync
after insert or update of plan_key, status, current_period_end
on public.seller_subscriptions
for each row execute function public.sync_identity_verification_on_subscription_change();

create or replace function public.review_identity_verification(p_application_id uuid, p_status text, p_reviewer_note text default null)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row public.verification_applications;
  v_legal_name text;
  v_plan public.seller_subscriptions;
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information') then raise exception 'INVALID_IDENTITY_REVIEW_STATUS'; end if;
  select * into v_row from public.verification_applications where id = p_application_id and verification_type = 'identity' for update;
  if v_row.id is null then raise exception 'IDENTITY_APPLICATION_NOT_FOUND'; end if;
  if p_status = 'verified' then
    v_legal_name := nullif(trim(concat_ws(' ', v_row.legal_first_name, v_row.legal_middle_name, v_row.legal_last_name)), '');
    if v_legal_name is null then raise exception 'LEGAL_NAME_REQUIRED_FOR_APPROVAL'; end if;
    select * into v_plan from public.seller_subscriptions where profile_id = v_row.user_id for update;
    if v_plan.profile_id is null or v_plan.plan_key not in ('premium','business') or v_plan.status <> 'active' or (v_plan.current_period_end is not null and v_plan.current_period_end <= timezone('utc', now())) then
      raise exception 'ACTIVE_PREMIUM_OR_BUSINESS_SUBSCRIPTION_REQUIRED';
    end if;
  end if;
  update public.verification_applications
     set status = p_status,
         reviewer_note = nullif(trim(p_reviewer_note), ''),
         reviewed_by = auth.uid(),
         reviewed_at = timezone('utc', now()),
         verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
         updated_at = timezone('utc', now())
   where id = v_row.id
   returning * into v_row;
  if p_status = 'verified' then
    update public.profiles
       set display_name = v_legal_name,
           is_verified = true,
           verification_expires_at = v_plan.current_period_end,
           updated_at = timezone('utc', now())
     where id = v_row.user_id;
    insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
    values (v_row.user_id, auth.uid(), 'identity_verification_reviewed', 'Identity verified', 'Your ID was approved. Your profile name now matches your verified legal name.', jsonb_build_object('status', 'verified'));
  else
    insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
    values (v_row.user_id, auth.uid(), 'identity_verification_reviewed', 'Identity verification updated', coalesce(nullif(trim(p_reviewer_note), ''), 'Your identity verification status was updated.'), jsonb_build_object('status', p_status));
  end if;
  return v_row;
end;
$$;

revoke all on function public.review_identity_verification(uuid,text,text) from public, anon;
grant execute on function public.review_identity_verification(uuid,text,text) to authenticated;

select public.sync_identity_verification_entitlements();
