-- Public mini-store rollout: an active business profile is discoverable even
-- before verification; the verified badge remains controlled by is_verified.
drop policy if exists business_profiles_public_read on public.business_profiles;
create policy business_profiles_public_read on public.business_profiles
  for select to anon, authenticated
  using (is_active = true or profile_id = auth.uid());

comment on policy business_profiles_public_read on public.business_profiles is 'Active business profiles are public storefronts; verification only controls the verified badge.';
