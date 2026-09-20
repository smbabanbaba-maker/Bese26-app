-- On identity approval, synchronize the public profile name to the legal ID name.
create or replace function public.review_identity_verification(p_application_id uuid, p_status text, p_reviewer_note text default null)
returns public.verification_applications language plpgsql security definer set search_path = public, private as $$
declare v_row public.verification_applications; v_legal_name text;
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information') then raise exception 'INVALID_IDENTITY_REVIEW_STATUS'; end if;
  select * into v_row from public.verification_applications where id = p_application_id and verification_type = 'identity' for update;
  if v_row.id is null then raise exception 'IDENTITY_APPLICATION_NOT_FOUND'; end if;
  if p_status = 'verified' then
    v_legal_name := nullif(trim(concat_ws(' ', v_row.legal_first_name, v_row.legal_middle_name, v_row.legal_last_name)), '');
    if v_legal_name is null then raise exception 'LEGAL_NAME_REQUIRED_FOR_APPROVAL'; end if;
  end if;
  update public.verification_applications set status = p_status, reviewer_note = nullif(trim(p_reviewer_note), ''), reviewed_by = auth.uid(), reviewed_at = timezone('utc', now()), verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end, updated_at = timezone('utc', now()) where id = v_row.id returning * into v_row;
  if p_status = 'verified' then
    update public.profiles set display_name = v_legal_name, is_verified = true, verification_expires_at = coalesce(verification_expires_at, timezone('utc', now()) + interval '12 months'), updated_at = timezone('utc', now()) where id = v_row.user_id;
    insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data) values (v_row.user_id, auth.uid(), 'identity_verification_reviewed', 'Identity verified', 'Your ID was approved. Your profile name now matches your verified legal name.', jsonb_build_object('status', 'verified'));
  else
    insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data) values (v_row.user_id, auth.uid(), 'identity_verification_reviewed', 'Identity verification updated', coalesce(nullif(trim(p_reviewer_note), ''), 'Your identity verification status was updated.'), jsonb_build_object('status', p_status));
  end if;
  return v_row;
end; $$;
revoke all on function public.review_identity_verification(uuid,text,text) from public, anon;
grant execute on function public.review_identity_verification(uuid,text,text) to authenticated;
