-- Profile-first KYC: CAC verification no longer requires a business_profiles row or subscription.
-- Existing listings and accounts are preserved. Legacy business storefront rows are retired
-- separately by the cleanup section below; verification applications remain auditable.

alter table public.profiles
  add column if not exists cac_verified_name text,
  add column if not exists cac_verified_at timestamptz;

-- Everyone who is authenticated may submit an identity or CAC verification request.
drop policy if exists verification_self_insert on public.verification_applications;
create policy verification_self_insert on public.verification_applications
  for insert to authenticated
  with check (user_id = auth.uid() and verification_type in ('identity','seller','business'));

-- Replace the old subscription-gated trigger. Verification is a trust workflow,
-- not a paid feature; listing limits and paid boosts remain separately gated.
create or replace function public.enforce_paid_verification_gate()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.user_id <> auth.uid() and not public.current_user_can_moderate() then
    raise exception 'VERIFICATION_OWNER_MISMATCH';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_paid_verification_gate() from public, anon;
grant execute on function public.enforce_paid_verification_gate() to authenticated;

-- CAC submission is profile-first. The registered CAC name is stored in the application;
-- it becomes the public profile display name only after moderator approval.
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
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row public.verification_applications;
  v_name text := nullif(trim(coalesce(p_cac_registered_name, p_business_name, '')), '');
  v_address text := nullif(trim(coalesce(p_business_address, '')), '');
  v_registration text := nullif(trim(coalesce(p_registration_number, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_old_status text;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if v_name is null or v_address is null or v_phone is null then raise exception 'CAC_DETAILS_INCOMPLETE'; end if;
  if p_registration_type not in ('registered','unregistered') then raise exception 'INVALID_CAC_TYPE'; end if;
  if p_registration_type = 'registered' and v_registration is null then raise exception 'CAC_REGISTRATION_NUMBER_REQUIRED'; end if;
  if p_document_path is null or trim(p_document_path) = '' then raise exception 'CAC_DOCUMENT_REQUIRED'; end if;
  if not (p_document_path like auth.uid()::text || '/%') then raise exception 'CAC_DOCUMENT_OWNER_MISMATCH'; end if;
  if exists (select 1 from public.verification_applications where user_id = auth.uid() and verification_type = 'business' and status in ('pending','pending_review','under_review','requires_more_information')) then raise exception 'CAC_VERIFICATION_ALREADY_OPEN'; end if;

  select status into v_old_status from public.verification_applications
   where user_id = auth.uid() and verification_type = 'business'
   order by created_at desc limit 1;

  insert into public.verification_applications
    (user_id, verification_type, full_name, phone, business_name, cac_registered_name,
     business_registration_type, registration_number, business_address, notes,
     document_path, status, submitted_at)
  values
    (auth.uid(), 'business', coalesce((select display_name from public.profiles where id = auth.uid()), v_name),
     v_phone, v_name, v_name, p_registration_type, v_registration, v_address, v_notes,
     p_document_path, 'pending_review', timezone('utc', now()))
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.submit_business_verification(text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_business_verification(text,text,text,text,text,text,text,text) to authenticated;

-- Moderator approval writes the approved CAC name onto the profile. It no longer touches
-- business_profiles, so the public identity remains the user's Profile everywhere.
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
  v_note text := nullif(trim(coalesce(p_reviewer_note, '')), '');
  v_cac_name text;
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information','suspended') then raise exception 'INVALID_CAC_REVIEW_STATUS'; end if;
  select * into v_row from public.verification_applications where id = p_application_id and verification_type = 'business' for update;
  if v_row.id is null then raise exception 'CAC_APPLICATION_NOT_FOUND'; end if;

  update public.verification_applications
     set status = case when p_status = 'verified' then 'verified' else p_status end,
         reviewer_note = v_note, reviewed_by = auth.uid(), reviewed_at = timezone('utc', now()),
         verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
         updated_at = timezone('utc', now())
   where id = v_row.id returning * into v_row;

  v_cac_name := nullif(trim(coalesce(v_row.cac_registered_name, v_row.business_name, '')), '');
  update public.profiles
     set cac_verified_name = case when p_status = 'verified' then v_cac_name else null end,
         cac_verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
         updated_at = timezone('utc', now())
   where id = v_row.user_id;

  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (v_row.user_id, auth.uid(), 'business_verification_reviewed',
          case when p_status = 'verified' then 'CAC verified' else 'CAC verification updated' end,
          coalesce(v_note, case when p_status = 'verified' then 'Your CAC name is now shown on your public profile.' else 'Your CAC verification status was updated.' end),
          jsonb_build_object('status', v_row.status, 'cac_name', case when p_status = 'verified' then v_cac_name else null end));
  return v_row;
end;
$$;
revoke all on function public.review_business_verification(uuid,text,text) from public, anon;
grant execute on function public.review_business_verification(uuid,text,text) to authenticated;

-- Retire legacy business storefront rows without deleting users or listings. Listings keep
-- seller_id and fall back to the user's Profile identity.
update public.listings
   set business_profile_id = null,
       published_as_type = 'personal'
 where business_profile_id is not null or published_as_type = 'business';

update public.business_profiles
   set is_active = false,
       updated_at = timezone('utc', now())
 where is_active = true;

comment on column public.profiles.cac_verified_name is 'Moderator-approved CAC registered name shown as the profile public display name.';
