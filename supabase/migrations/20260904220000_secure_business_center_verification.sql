-- Secure Business Center and business verification workflow.
-- A business profile remains owned by the personal auth account; verification is
-- only changed by the moderator RPC below.
alter table public.business_profiles
  add column if not exists verification_status text not null default 'not_started',
  add column if not exists verified_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

alter table public.business_profiles
  drop constraint if exists business_profiles_verification_status_check;
alter table public.business_profiles
  add constraint business_profiles_verification_status_check
  check (verification_status in ('not_started','draft','pending_review','under_review','verified','requires_more_information','rejected','suspended'));

alter table public.verification_applications
  drop constraint if exists verification_applications_status_check;
alter table public.verification_applications
  add constraint verification_applications_status_check
  check (status in ('draft','pending','pending_review','under_review','approved','verified','rejected','action_required','requires_more_information','suspended'));

-- Keep the existing identity/seller application path, but force business
-- submissions through the ownership-aware RPC.
drop policy if exists verification_self_insert on public.verification_applications;
create policy verification_self_insert on public.verification_applications
  for insert to authenticated
  with check (user_id = auth.uid() and verification_type in ('identity','seller'));

drop policy if exists business_verification_owner_update on public.verification_applications;
create policy business_verification_owner_update on public.verification_applications
  for update to authenticated
  using (user_id = auth.uid() and verification_type = 'business' and status in ('rejected','requires_more_information'))
  with check (user_id = auth.uid() and verification_type = 'business' and status in ('rejected','requires_more_information'));

create unique index if not exists one_open_business_verification_per_owner
  on public.verification_applications(user_id)
  where verification_type = 'business' and status in ('pending','pending_review','under_review','requires_more_information');

create table if not exists public.business_verification_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.verification_applications(id) on delete cascade,
  business_profile_id uuid not null references public.business_profiles(profile_id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('submitted','under_review','approved','verified','rejected','requires_more_information','suspended','resubmitted','document_uploaded')),
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists business_verification_events_business_idx on public.business_verification_events(business_profile_id, created_at desc);
create index if not exists business_verification_events_application_idx on public.business_verification_events(application_id, created_at desc);
alter table public.business_verification_events enable row level security;
drop policy if exists business_verification_events_owner_read on public.business_verification_events;
create policy business_verification_events_owner_read on public.business_verification_events for select to authenticated
  using (exists (select 1 from public.business_profiles b where b.profile_id = auth.uid() and b.profile_id = business_profile_id));
drop policy if exists business_verification_events_moderator_read on public.business_verification_events;
create policy business_verification_events_moderator_read on public.business_verification_events for select to authenticated
  using (public.current_user_can_moderate());
grant select on public.business_verification_events to authenticated;

create or replace function public.submit_business_verification(
  p_business_name text,
  p_business_address text,
  p_registration_type text,
  p_registration_number text default null,
  p_phone text default null,
  p_notes text default null,
  p_document_path text default null
)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_business public.business_profiles;
  v_old_status text;
  v_row public.verification_applications;
  v_name text := nullif(trim(coalesce(p_business_name, '')), '');
  v_address text := nullif(trim(coalesce(p_business_address, '')), '');
  v_registration text := nullif(trim(coalesce(p_registration_number, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  select * into v_business from public.business_profiles where profile_id = auth.uid() for update;
  if v_business.profile_id is null then raise exception 'BUSINESS_PROFILE_REQUIRED'; end if;
  if v_name is null or v_address is null or v_phone is null then raise exception 'BUSINESS_DETAILS_INCOMPLETE'; end if;
  if p_registration_type not in ('registered','unregistered') then raise exception 'INVALID_BUSINESS_TYPE'; end if;
  if p_registration_type = 'registered' and v_registration is null then raise exception 'REGISTRATION_NUMBER_REQUIRED'; end if;
  if p_document_path is null or trim(p_document_path) = '' then raise exception 'BUSINESS_DOCUMENT_REQUIRED'; end if;
  if not (p_document_path like auth.uid()::text || '/%') then raise exception 'BUSINESS_DOCUMENT_OWNER_MISMATCH'; end if;
  if exists (select 1 from public.verification_applications where user_id = auth.uid() and verification_type = 'business' and status in ('pending','pending_review','under_review','requires_more_information')) then raise exception 'BUSINESS_VERIFICATION_ALREADY_OPEN'; end if;
  select status into v_old_status from public.verification_applications where user_id = auth.uid() and verification_type = 'business' order by created_at desc limit 1;
  insert into public.verification_applications (user_id, verification_type, full_name, phone, business_name, business_registration_type, registration_number, business_address, notes, document_path, status, submitted_at)
  values (auth.uid(), 'business', coalesce((select display_name from public.profiles where id = auth.uid()), v_name), v_phone, v_name, p_registration_type, v_registration, v_address, v_notes, p_document_path, 'pending_review', timezone('utc', now()))
  returning * into v_row;
  update public.business_profiles
  set verification_status = 'pending_review', is_verified = false, verified_at = null, updated_at = timezone('utc', now())
  where profile_id = auth.uid();
  insert into public.business_verification_events (application_id, business_profile_id, actor_id, event_type, from_status, to_status, note)
  values (v_row.id, auth.uid(), auth.uid(), case when v_old_status in ('rejected','requires_more_information') then 'resubmitted' else 'submitted' end, v_old_status, 'pending_review', v_notes);
  return v_row;
end;
$$;
revoke all on function public.submit_business_verification(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_business_verification(text,text,text,text,text,text,text) to authenticated;

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
  select * into v_row from public.verification_applications where id = p_application_id and verification_type = 'business' for update;
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

comment on table public.business_verification_events is 'Private audit trail for business verification decisions and submissions.';
