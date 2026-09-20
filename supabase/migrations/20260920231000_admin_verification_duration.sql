-- Allow owner/moderator email grants to have an explicit expiry (months, capped at 120).
create or replace function public.admin_grant_verification_by_email(p_email text, p_note text, p_duration_months integer default 12)
returns jsonb language plpgsql security definer set search_path = public, private, auth as $$
declare
  v_email text := lower(trim(p_email));
  v_note text := nullif(trim(p_note), '');
  v_user_id uuid;
  v_profile public.profiles;
  v_business public.business_profiles;
  v_expires timestamptz;
  v_months integer := greatest(1, least(coalesce(p_duration_months, 12), 120));
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if v_email is null or v_email = '' then raise exception 'EMAIL_REQUIRED'; end if;
  if v_note is null then raise exception 'REASON_REQUIRED'; end if;
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  if v_user_id is null then raise exception 'USER_EMAIL_NOT_FOUND'; end if;
  v_expires := timezone('utc', now()) + make_interval(months => v_months);
  update public.profiles set is_verified = true, verification_expires_at = v_expires, updated_at = timezone('utc', now()) where id = v_user_id returning * into v_profile;
  if v_profile.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  update public.business_profiles set is_verified = true, verification_status = 'verified', verified_at = timezone('utc', now()), verification_expires_at = v_expires, updated_at = timezone('utc', now()) where profile_id = v_user_id returning * into v_business;
  insert into public.admin_verification_grants (user_id, email, actor_id, note) values (v_user_id, v_email, auth.uid(), v_note || ' · Expires: ' || to_char(v_expires, 'YYYY-MM-DD'));
  return jsonb_build_object('user_id', v_user_id, 'email', v_email, 'display_name', v_profile.display_name, 'username', v_profile.username, 'profile_verified', v_profile.is_verified, 'business_verified', coalesce(v_business.is_verified, false), 'expires_at', v_expires, 'duration_months', v_months, 'note', v_note);
end; $$;
revoke all on function public.admin_grant_verification_by_email(text, text, integer) from public, anon;
grant execute on function public.admin_grant_verification_by_email(text, text, integer) to authenticated;
