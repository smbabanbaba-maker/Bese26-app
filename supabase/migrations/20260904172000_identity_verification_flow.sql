-- Bese26 identity verification / KYC workflow.
-- Reuses verification_applications; identity-specific fields are additive.

alter table public.verification_applications
  drop constraint if exists verification_applications_status_check;
alter table public.verification_applications
  add constraint verification_applications_status_check
  check (status in ('draft','pending','pending_review','under_review','approved','verified','rejected','action_required','requires_more_information'));

alter table public.verification_applications
  add column if not exists legal_first_name text,
  add column if not exists legal_middle_name text,
  add column if not exists legal_last_name text,
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists country text,
  add column if not exists state text,
  add column if not exists city text,
  add column if not exists residential_address text,
  add column if not exists document_type text,
  add column if not exists document_number_reference text,
  add column if not exists document_country text,
  add column if not exists document_expiry date,
  add column if not exists document_front_path text,
  add column if not exists document_back_path text,
  add column if not exists selfie_path text,
  add column if not exists provider text not null default 'manual_review',
  add column if not exists provider_reference text,
  add column if not exists provider_status text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists accuracy_confirmed boolean not null default false,
  add column if not exists liveness_status text not null default 'not_configured';

create index if not exists verification_identity_status_idx
  on public.verification_applications(verification_type, status, created_at desc);
create unique index if not exists one_open_identity_verification_per_user
  on public.verification_applications(user_id)
  where verification_type = 'identity' and status in ('draft','pending','pending_review','under_review','requires_more_information');

-- Users may save/update only their own non-final identity draft. They cannot
-- approve themselves, set provider results, or change a final decision.
drop policy if exists verification_identity_self_update on public.verification_applications;
create policy verification_identity_self_update on public.verification_applications
  for update to authenticated
  using (
    user_id = auth.uid()
    and verification_type = 'identity'
    and status in ('draft','rejected','requires_more_information')
  )
  with check (
    user_id = auth.uid()
    and verification_type = 'identity'
    and status in ('draft','requires_more_information')
  );

-- The RPC is the only browser-callable path that submits an identity request.
create or replace function public.submit_identity_verification(p_application_id uuid)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row public.verification_applications;
begin
  select * into v_row
  from public.verification_applications
  where id = p_application_id
    and user_id = auth.uid()
    and verification_type = 'identity'
  for update;
  if v_row.id is null then raise exception 'IDENTITY_APPLICATION_NOT_FOUND'; end if;
  if v_row.status not in ('draft','requires_more_information') then raise exception 'IDENTITY_APPLICATION_NOT_EDITABLE'; end if;
  if not v_row.accuracy_confirmed then raise exception 'ACCURACY_CONFIRMATION_REQUIRED'; end if;
  if v_row.legal_first_name is null or v_row.legal_last_name is null or v_row.date_of_birth is null
     or v_row.country is null or v_row.state is null or v_row.city is null or v_row.residential_address is null
     or v_row.document_type is null or v_row.document_number_reference is null or v_row.document_front_path is null
  then raise exception 'IDENTITY_APPLICATION_INCOMPLETE'; end if;
  update public.verification_applications
  set status = 'pending_review', submitted_at = timezone('utc', now()), updated_at = timezone('utc', now())
  where id = v_row.id
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.submit_identity_verification(uuid) from public, anon;
grant execute on function public.submit_identity_verification(uuid) to authenticated;

create or replace function public.review_identity_verification(p_application_id uuid, p_status text, p_reviewer_note text default null)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row public.verification_applications;
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information') then raise exception 'INVALID_IDENTITY_REVIEW_STATUS'; end if;
  update public.verification_applications
  set status = p_status,
      reviewer_note = nullif(trim(p_reviewer_note), ''),
      reviewed_by = auth.uid(),
      reviewed_at = timezone('utc', now()),
      verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
      updated_at = timezone('utc', now())
  where id = p_application_id and verification_type = 'identity'
  returning * into v_row;
  if v_row.id is null then raise exception 'IDENTITY_APPLICATION_NOT_FOUND'; end if;
  if p_status = 'verified' then
    update public.profiles set is_verified = true, updated_at = timezone('utc', now()) where id = v_row.user_id;
  end if;
  return v_row;
end;
$$;
revoke all on function public.review_identity_verification(uuid, text, text) from public, anon;
grant execute on function public.review_identity_verification(uuid, text, text) to authenticated;

drop policy if exists verification_docs_update on storage.objects;
create policy verification_docs_update on storage.objects for update to authenticated
  using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists verification_docs_delete on storage.objects;
create policy verification_docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Admin-only result changes remain separate from user draft editing.
comment on table public.verification_applications is 'Seller, business, and identity verification requests. Identity approval is controlled by moderation or a trusted provider webhook.';
