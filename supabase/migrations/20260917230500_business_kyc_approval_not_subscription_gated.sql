-- Business KYC approval is a document/moderation decision, not a payment decision.
-- Subscription entitlements remain enforced by listing and paid-feature gates.
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
  v_note text := nullif(trim(coalesce(p_reviewer_note, '')), '');
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information','suspended') then raise exception 'INVALID_BUSINESS_REVIEW_STATUS'; end if;

  select * into v_row
    from public.verification_applications
   where id = p_application_id and verification_type = 'business'
   for update;
  if v_row.id is null then raise exception 'BUSINESS_APPLICATION_NOT_FOUND'; end if;

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
         verification_expires_at = null,
         verification_plan_key = null,
         suspended_at = case when p_status = 'suspended' then timezone('utc', now()) else null end,
         suspension_reason = case when p_status = 'suspended' then v_note else null end,
         updated_at = timezone('utc', now())
   where profile_id = v_row.user_id
   returning * into v_business;
  if v_business.profile_id is null then raise exception 'BUSINESS_PROFILE_NOT_FOUND'; end if;

  insert into public.business_verification_events (application_id, business_profile_id, actor_id, event_type, from_status, to_status, note)
  values (v_row.id, v_business.profile_id, auth.uid(), p_status, null, v_row.status, v_note);
  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (v_row.user_id, auth.uid(), 'business_verification_reviewed', case when p_status = 'verified' then 'Business verified' else 'Business verification updated' end, coalesce(v_note, 'Your business verification status was updated.'), jsonb_build_object('business_profile_id', v_business.profile_id, 'status', v_row.status));
  return v_row;
end;
$$;
revoke all on function public.review_business_verification(uuid, text, text) from public, anon;
grant execute on function public.review_business_verification(uuid, text, text) to authenticated;
