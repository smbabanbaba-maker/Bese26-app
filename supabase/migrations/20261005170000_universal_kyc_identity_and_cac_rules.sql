-- Universal KYC policy for Bese26.
-- Every authenticated user may submit ID and CAC KYC. Approval remains manual and
-- private documents are never exposed publicly.

alter table public.verification_applications
  add column if not exists legal_name_matches_document boolean not null default false,
  add column if not exists authorized_representative_name text,
  add column if not exists applicant_role text,
  add column if not exists owner_relationship text,
  add column if not exists ownership_declaration boolean not null default false;

comment on column public.verification_applications.legal_name_matches_document is
  'Applicant confirms the submitted legal name matches the government ID exactly.';
comment on column public.verification_applications.authorized_representative_name is
  'Private CAC applicant/authorized representative name as supplied for review.';
comment on column public.verification_applications.applicant_role is
  'Private role of the CAC applicant, such as owner, director, secretary, or authorized representative.';
comment on column public.verification_applications.owner_relationship is
  'Private explanation of the applicant relationship to the CAC-registered entity.';
comment on column public.verification_applications.ownership_declaration is
  'Applicant declares that they own or are authorized to represent the CAC entity.';

-- Replace the historical paid-plan trigger: KYC is available to all users.
create or replace function public.enforce_paid_verification_gate()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.user_id is null then raise exception 'VERIFICATION_OWNER_REQUIRED'; end if;
  if new.user_id <> auth.uid() and not public.current_user_can_moderate() then
    raise exception 'VERIFICATION_OWNER_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists verification_paid_plan_guard on public.verification_applications;
create trigger verification_paid_plan_guard
before insert or update on public.verification_applications
for each row execute function public.enforce_paid_verification_gate();

-- Keep the entitlement shape stable for the frontend, but make KYC eligibility
-- independent of subscription. Listing limits remain unchanged elsewhere.
create or replace function public.get_seller_entitlement()
returns table (
  plan_key text, subscription_status text, is_paid boolean, free_posts_limit integer,
  free_posts_used integer, free_posts_remaining integer, listing_limit integer,
  current_period_end timestamptz, boost_credits_limit integer, boost_credits_used integer,
  boost_credits_remaining integer, verification_eligible boolean
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz := null;
  v_used integer := 0;
  v_limit integer := 3;
  v_boost_granted integer := 0;
  v_boost_used integer := 0;
  v_unlimited boolean := false;
  v_paid boolean := false;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_unlimited := private.is_bese26_unlimited_admin(v_user);
  if v_unlimited then
    return query select 'admin', 'active', true, 2147483647, 0, 2147483647,
      2147483647, null::timestamptz, 2147483647, 0, 2147483647, true;
    return;
  end if;
  select lower(coalesce(s.plan_key, 'free')), lower(coalesce(s.status, 'inactive')), s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s where s.profile_id = v_user limit 1;
  v_plan := case when v_plan in ('basic', 'premium', 'business') then v_plan else 'free' end;
  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';
  if not v_paid then v_plan := 'free'; end if;
  v_limit := public.listing_limit_for_plan(v_plan);
  select count(*)::integer into v_used from public.listings l
    where l.seller_id = v_user and l.status in ('pending', 'active');
  begin
    select coalesce(c.credits_granted, 0), coalesce(c.credits_used, 0)
      into v_boost_granted, v_boost_used
      from public.ensure_monthly_boost_credits(v_user) c limit 1;
  exception when others then
    v_boost_granted := 0; v_boost_used := 0;
  end;
  return query select v_plan, case when v_paid then 'active' else 'inactive' end,
    v_paid, v_limit, v_used, greatest(v_limit - v_used, 0), v_limit, v_end,
    v_boost_granted, v_boost_used, greatest(v_boost_granted - v_boost_used, 0), true;
end;
$$;
revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;

-- ID approval is a manual decision, not a paid-plan benefit. The approved legal
-- name becomes the account's public identity and is protected by existing locks.
create or replace function public.review_identity_verification(
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
  v_legal_name text;
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information') then
    raise exception 'INVALID_IDENTITY_REVIEW_STATUS';
  end if;
  select * into v_row from public.verification_applications
   where id = p_application_id and verification_type = 'identity' for update;
  if v_row.id is null then raise exception 'IDENTITY_APPLICATION_NOT_FOUND'; end if;
  if p_status = 'verified' then
    v_legal_name := nullif(trim(concat_ws(' ', v_row.legal_first_name, v_row.legal_middle_name, v_row.legal_last_name)), '');
    if v_legal_name is null then raise exception 'LEGAL_NAME_REQUIRED_FOR_APPROVAL'; end if;
    if not coalesce(v_row.legal_name_matches_document, false) then raise exception 'LEGAL_NAME_CONFIRMATION_REQUIRED'; end if;
  end if;
  update public.verification_applications
     set status = p_status, reviewer_note = nullif(trim(p_reviewer_note), ''),
         reviewed_by = auth.uid(), reviewed_at = timezone('utc', now()),
         verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
         updated_at = timezone('utc', now())
   where id = v_row.id returning * into v_row;
  if p_status = 'verified' then
    update public.profiles set display_name = v_legal_name, is_verified = true,
      verification_expires_at = coalesce(verification_expires_at, timezone('utc', now()) + interval '12 months'),
      updated_at = timezone('utc', now()) where id = v_row.user_id;
    insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
    values (v_row.user_id, auth.uid(), 'identity_verification_reviewed', 'Identity verified',
      'Your ID was approved. Your profile name now matches your verified legal name everywhere on Bese26.',
      jsonb_build_object('status', 'verified', 'public_name', v_legal_name));
  else
    insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
    values (v_row.user_id, auth.uid(), 'identity_verification_reviewed', 'Identity verification updated',
      coalesce(nullif(trim(p_reviewer_note), ''), 'Your identity verification status was updated.'),
      jsonb_build_object('status', p_status));
  end if;
  return v_row;
end;
$$;
revoke all on function public.review_identity_verification(uuid, text, text) from public, anon;
grant execute on function public.review_identity_verification(uuid, text, text) to authenticated;

-- CAC requires an already approved ID identity, exact CAC name matching, a
-- registration number, an authorized representative, and an ownership declaration.
create or replace function public.submit_business_verification(
  p_business_name text,
  p_business_address text,
  p_registration_type text,
  p_registration_number text default null,
  p_phone text default null,
  p_notes text default null,
  p_document_path text default null,
  p_cac_registered_name text default null,
  p_authorized_representative_name text default null,
  p_applicant_role text default null,
  p_owner_relationship text default null,
  p_ownership_declaration boolean default false
)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_old_status text;
  v_row public.verification_applications;
  v_name text := nullif(trim(coalesce(p_business_name, '')), '');
  v_cac_name text := nullif(trim(coalesce(p_cac_registered_name, '')), '');
  v_address text := nullif(trim(coalesce(p_business_address, '')), '');
  v_registration text := nullif(trim(coalesce(p_registration_number, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_rep text := nullif(trim(coalesce(p_authorized_representative_name, '')), '');
  v_role text := nullif(trim(coalesce(p_applicant_role, '')), '');
  v_relationship text := nullif(trim(coalesce(p_owner_relationship, '')), '');
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_identity_verified boolean;
begin
  select coalesce(is_verified, false) into v_identity_verified from public.profiles where id = auth.uid();
  if not coalesce(v_identity_verified, false) then raise exception 'IDENTITY_VERIFICATION_REQUIRED_FOR_CAC'; end if;
  if v_name is null or v_cac_name is null or v_address is null or v_phone is null or v_rep is null or v_role is null or v_relationship is null then
    raise exception 'CAC_OWNERSHIP_DETAILS_INCOMPLETE';
  end if;
  if lower(regexp_replace(v_name, '[^a-z0-9]', '', 'g')) <> lower(regexp_replace(v_cac_name, '[^a-z0-9]', '', 'g')) then
    raise exception 'CAC_NAME_MUST_MATCH_PUBLIC_NAME';
  end if;
  if p_registration_type <> 'registered' then raise exception 'CAC_REGISTERED_TYPE_REQUIRED'; end if;
  if v_registration is null then raise exception 'REGISTRATION_NUMBER_REQUIRED'; end if;
  if p_document_path is null or trim(p_document_path) = '' then raise exception 'CAC_DOCUMENT_REQUIRED'; end if;
  if not (p_document_path like auth.uid()::text || '/%') then raise exception 'BUSINESS_DOCUMENT_OWNER_MISMATCH'; end if;
  if not coalesce(p_ownership_declaration, false) then raise exception 'CAC_OWNERSHIP_DECLARATION_REQUIRED'; end if;
  if exists (select 1 from public.verification_applications where user_id = auth.uid() and verification_type = 'business' and status in ('pending','pending_review','under_review','requires_more_information')) then raise exception 'BUSINESS_VERIFICATION_ALREADY_OPEN'; end if;
  select status into v_old_status from public.verification_applications where user_id = auth.uid() and verification_type = 'business' order by created_at desc limit 1;
  insert into public.verification_applications (
    user_id, verification_type, full_name, phone, business_name, cac_registered_name,
    business_registration_type, registration_number, business_address, notes, document_path,
    authorized_representative_name, applicant_role, owner_relationship, ownership_declaration,
    status, submitted_at
  ) values (
    auth.uid(), 'business', (select display_name from public.profiles where id = auth.uid()), v_phone,
    v_cac_name, v_cac_name, 'registered', v_registration, v_address, v_notes, p_document_path,
    v_rep, v_role, v_relationship, true, 'pending_review', timezone('utc', now())
  ) returning * into v_row;
  insert into public.business_verification_events (application_id, business_profile_id, actor_id, event_type, from_status, to_status, note)
  values (v_row.id, null, auth.uid(), case when v_old_status in ('rejected','requires_more_information') then 'resubmitted' else 'submitted' end, v_old_status, 'pending_review', v_notes);
  return v_row;
end;
$$;
revoke all on function public.submit_business_verification(text,text,text,text,text,text,text,text,text,text,text,boolean) from public, anon;
grant execute on function public.submit_business_verification(text,text,text,text,text,text,text,text,text,text,text,boolean) to authenticated;

create index if not exists verification_applications_cac_review_idx
  on public.verification_applications (verification_type, status, registration_number)
  where verification_type = 'business';

-- Re-define the identity submit RPC so direct API callers cannot bypass the
-- exact-name declaration required by the UI.
create or replace function public.submit_identity_verification(p_application_id uuid)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row public.verification_applications;
begin
  select * into v_row from public.verification_applications
   where id = p_application_id and user_id = auth.uid() and verification_type = 'identity' for update;
  if v_row.id is null then raise exception 'IDENTITY_APPLICATION_NOT_FOUND'; end if;
  if v_row.status not in ('draft','requires_more_information') then raise exception 'IDENTITY_APPLICATION_NOT_EDITABLE'; end if;
  if not v_row.accuracy_confirmed then raise exception 'ACCURACY_CONFIRMATION_REQUIRED'; end if;
  if not v_row.legal_name_matches_document then raise exception 'LEGAL_NAME_CONFIRMATION_REQUIRED'; end if;
  if v_row.legal_first_name is null or v_row.legal_last_name is null or v_row.date_of_birth is null
     or v_row.country is null or v_row.state is null or v_row.city is null or v_row.residential_address is null
     or v_row.document_type is null or v_row.document_number_reference is null or v_row.document_front_path is null
  then raise exception 'IDENTITY_APPLICATION_INCOMPLETE'; end if;
  update public.verification_applications
     set status = 'pending_review', submitted_at = timezone('utc', now()), updated_at = timezone('utc', now())
   where id = v_row.id returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.submit_identity_verification(uuid) from public, anon;
grant execute on function public.submit_identity_verification(uuid) to authenticated;
