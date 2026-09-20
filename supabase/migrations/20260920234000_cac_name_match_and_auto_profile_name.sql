-- Require an explicit CAC registered name and enforce it during approval.
alter table public.verification_applications add column if not exists cac_registered_name text;

drop function if exists public.submit_business_verification(text,text,text,text,text,text,text);
create or replace function public.submit_business_verification(
  p_business_name text,
  p_business_address text,
  p_registration_type text,
  p_registration_number text default null,
  p_phone text default null,
  p_notes text default null,
  p_document_path text default null,
  p_cac_registered_name text default null
)
returns public.verification_applications language plpgsql security definer set search_path = public, private as $$
declare v_business public.business_profiles; v_old_status text; v_row public.verification_applications; v_name text := nullif(trim(coalesce(p_business_name, '')), ''); v_cac_name text := nullif(trim(coalesce(p_cac_registered_name, '')), ''); v_address text := nullif(trim(coalesce(p_business_address, '')), ''); v_registration text := nullif(trim(coalesce(p_registration_number, '')), ''); v_phone text := nullif(trim(coalesce(p_phone, '')), ''); v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  select * into v_business from public.business_profiles where profile_id = auth.uid() for update;
  if v_business.profile_id is null then raise exception 'BUSINESS_PROFILE_REQUIRED'; end if;
  if v_name is null or v_cac_name is null or v_address is null or v_phone is null then raise exception 'BUSINESS_DETAILS_INCOMPLETE'; end if;
  if p_registration_type not in ('registered','unregistered') then raise exception 'INVALID_BUSINESS_TYPE'; end if;
  if p_registration_type = 'registered' and v_registration is null then raise exception 'REGISTRATION_NUMBER_REQUIRED'; end if;
  if p_document_path is null or trim(p_document_path) = '' then raise exception 'BUSINESS_DOCUMENT_REQUIRED'; end if;
  if not (p_document_path like auth.uid()::text || '/%') then raise exception 'BUSINESS_DOCUMENT_OWNER_MISMATCH'; end if;
  if exists (select 1 from public.verification_applications where user_id = auth.uid() and verification_type = 'business' and status in ('pending','pending_review','under_review','requires_more_information')) then raise exception 'BUSINESS_VERIFICATION_ALREADY_OPEN'; end if;
  select status into v_old_status from public.verification_applications where user_id = auth.uid() and verification_type = 'business' order by created_at desc limit 1;
  insert into public.verification_applications (user_id, verification_type, full_name, phone, business_name, cac_registered_name, business_registration_type, registration_number, business_address, notes, document_path, status, submitted_at)
  values (auth.uid(), 'business', coalesce((select display_name from public.profiles where id = auth.uid()), v_name), v_phone, v_name, v_cac_name, p_registration_type, v_registration, v_address, v_notes, p_document_path, 'pending_review', timezone('utc', now())) returning * into v_row;
  update public.business_profiles set verification_status = 'pending_review', is_verified = false, verified_at = null, updated_at = timezone('utc', now()) where profile_id = auth.uid();
  insert into public.business_verification_events (application_id, business_profile_id, actor_id, event_type, from_status, to_status, note) values (v_row.id, auth.uid(), auth.uid(), case when v_old_status in ('rejected','requires_more_information') then 'resubmitted' else 'submitted' end, v_old_status, 'pending_review', v_notes);
  return v_row;
end; $$;
revoke all on function public.submit_business_verification(text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_business_verification(text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.review_business_verification(p_application_id uuid, p_status text, p_reviewer_note text default null)
returns public.verification_applications language plpgsql security definer set search_path = public, private as $$
declare v_row public.verification_applications; v_business public.business_profiles; v_note text := nullif(trim(coalesce(p_reviewer_note, '')), '');
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information','suspended') then raise exception 'INVALID_BUSINESS_REVIEW_STATUS'; end if;
  select * into v_row from public.verification_applications where id = p_application_id and verification_type = 'business' for update;
  if v_row.id is null then raise exception 'BUSINESS_APPLICATION_NOT_FOUND'; end if;
  if p_status = 'verified' and lower(regexp_replace(coalesce(v_row.business_name, ''), '[^a-z0-9]', '', 'g')) <> lower(regexp_replace(coalesce(v_row.cac_registered_name, ''), '[^a-z0-9]', '', 'g')) then raise exception 'CAC_NAME_MISMATCH'; end if;
  update public.verification_applications set status = case when p_status = 'verified' then 'verified' else p_status end, reviewer_note = v_note, reviewed_by = auth.uid(), reviewed_at = timezone('utc', now()), verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end, updated_at = timezone('utc', now()) where id = v_row.id returning * into v_row;
  update public.business_profiles set verification_status = v_row.status, is_verified = (p_status = 'verified'), verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end, verification_expires_at = case when p_status = 'verified' then coalesce(verification_expires_at, timezone('utc', now()) + interval '1 month') else null end, updated_at = timezone('utc', now()) where profile_id = v_row.user_id returning * into v_business;
  if v_business.profile_id is null then raise exception 'BUSINESS_PROFILE_NOT_FOUND'; end if;
  insert into public.business_verification_events (application_id, business_profile_id, actor_id, event_type, from_status, to_status, note) values (v_row.id, v_business.profile_id, auth.uid(), p_status, null, v_row.status, v_note);
  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data) values (v_row.user_id, auth.uid(), 'business_verification_reviewed', case when p_status = 'verified' then 'Business verified' else 'Business verification updated' end, coalesce(v_note, 'Your business verification status was updated.'), jsonb_build_object('business_profile_id', v_business.profile_id, 'status', v_row.status));
  return v_row;
end; $$;
revoke all on function public.review_business_verification(uuid,text,text) from public, anon;
grant execute on function public.review_business_verification(uuid,text,text) to authenticated;
