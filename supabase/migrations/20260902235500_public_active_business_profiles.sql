-- Public business pages are discoverable after a business profile is created.
-- Verification controls the badge and trust label; it does not hide an active company page.
drop policy if exists business_profiles_public_read on public.business_profiles;
create policy business_profiles_public_read
  on public.business_profiles
  for select
  to anon, authenticated
  using (is_active = true or profile_id = auth.uid());

-- Keep the directory and public-page lookup fast.
create index if not exists business_profiles_directory_active_idx
  on public.business_profiles (is_active, business_name);
