-- Complete the identity KYC review loop: persist the decision and notify the applicant.
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
  v_title text;
  v_body text;
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information') then raise exception 'INVALID_IDENTITY_REVIEW_STATUS'; end if;

  update public.verification_applications
  set status = p_status,
      reviewer_note = nullif(trim(coalesce(p_reviewer_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = timezone('utc', now()),
      verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
      updated_at = timezone('utc', now())
  where id = p_application_id and verification_type = 'identity'
  returning * into v_row;
  if v_row.id is null then raise exception 'IDENTITY_APPLICATION_NOT_FOUND'; end if;

  update public.profiles
  set is_verified = (p_status = 'verified'),
      verification_expires_at = case when p_status = 'verified' then coalesce(verification_expires_at, timezone('utc', now()) + interval '12 months') else null end,
      updated_at = timezone('utc', now())
  where id = v_row.user_id;

  v_title := case
    when p_status = 'verified' then 'ID verification approved'
    when p_status = 'under_review' then 'ID verification under review'
    when p_status = 'requires_more_information' then 'More ID information required'
    else 'ID verification not approved'
  end;
  v_body := case
    when p_status = 'verified' then 'Bese26 has verified your identity. Your ID Verified badge is now active.'
    when p_status = 'under_review' then 'Your identity documents are under review by the Bese26 Admin team.'
    when p_status = 'requires_more_information' then 'Bese26 needs more information before your identity can be verified. Please open Verification & Trust for the reviewer note.'
    else 'Your identity verification was not approved. Please review the note and submit again.'
  end;

  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (v_row.user_id, auth.uid(), 'identity_verification_reviewed', v_title, coalesce(nullif(trim(p_reviewer_note), ''), v_body), jsonb_build_object('application_id', v_row.id, 'status', p_status));

  return v_row;
end;
$$;
revoke all on function public.review_identity_verification(uuid, text, text) from public, anon;
grant execute on function public.review_identity_verification(uuid, text, text) to authenticated;
