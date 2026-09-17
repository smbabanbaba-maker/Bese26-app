-- Keep personal identity verification and business registration verification distinct.
-- profiles.is_verified is the public ID Verified flag.
-- business_profiles.is_verified + verification_status = 'verified' is the public CAC Verified flag.

comment on column public.profiles.is_verified is 'ID Verified: Bese26 has verified this person identity.';
comment on column public.business_profiles.is_verified is 'CAC Verified: Bese26 has approved this business registration.';
comment on column public.business_profiles.verification_status is 'Business/CAC verification workflow status; only verified exposes CAC Verified publicly.';

-- Repair any legacy business rows whose boolean drifted from the reviewed workflow status.
update public.business_profiles
set is_verified = (verification_status = 'verified'),
    verified_at = case when verification_status = 'verified' then coalesce(verified_at, timezone('utc', now())) else null end,
    updated_at = timezone('utc', now())
where is_verified is distinct from (verification_status = 'verified');

create index if not exists profiles_id_verified_idx
  on public.profiles (id)
  where is_verified = true;
create index if not exists business_profiles_cac_verified_idx
  on public.business_profiles (profile_id)
  where is_verified = true and verification_status = 'verified';
