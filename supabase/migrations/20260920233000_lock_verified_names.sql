-- Freeze verified identity/business names for self-service updates.
-- Owner admin remains able to correct records through an authorized workflow.
create or replace function private.prevent_verified_name_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_active boolean;
begin
  if private.is_bese26_owner_admin() then return new; end if;
  if tg_table_name = 'profiles' then
    v_active := coalesce(old.is_verified, false) and (old.verification_expires_at is null or old.verification_expires_at > timezone('utc', now()));
    if v_active and auth.uid() = old.id and new.display_name is distinct from old.display_name then raise exception 'VERIFIED_PROFILE_NAME_LOCKED'; end if;
  elsif tg_table_name = 'business_profiles' then
    v_active := (coalesce(old.is_verified, false) or lower(coalesce(old.verification_status, '')) = 'verified') and (old.verification_expires_at is null or old.verification_expires_at > timezone('utc', now()));
    if v_active and auth.uid() = old.profile_id and new.business_name is distinct from old.business_name then raise exception 'VERIFIED_BUSINESS_NAME_LOCKED'; end if;
  elsif tg_table_name = 'verification_applications' then
    v_active := lower(coalesce(old.status, '')) in ('verified', 'approved');
    if v_active and auth.uid() = old.user_id and (new.legal_first_name is distinct from old.legal_first_name or new.legal_middle_name is distinct from old.legal_middle_name or new.legal_last_name is distinct from old.legal_last_name or new.business_name is distinct from old.business_name) then raise exception 'APPROVED_KYC_NAME_LOCKED'; end if;
  end if;
  return new;
end; $$;

drop trigger if exists profiles_verified_name_lock on public.profiles;
create trigger profiles_verified_name_lock before update on public.profiles for each row execute function private.prevent_verified_name_change();
drop trigger if exists business_verified_name_lock on public.business_profiles;
create trigger business_verified_name_lock before update on public.business_profiles for each row execute function private.prevent_verified_name_change();
drop trigger if exists verification_application_name_lock on public.verification_applications;
create trigger verification_application_name_lock before update on public.verification_applications for each row execute function private.prevent_verified_name_change();
