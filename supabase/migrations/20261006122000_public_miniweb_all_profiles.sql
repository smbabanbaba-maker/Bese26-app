-- Every Bese26 account gets a public miniweb/profile route.
-- Directory visibility and public direct links are separate concerns.
-- Verification remains a badge/trust state; it does not block the public page.
drop policy if exists business_profiles_public_read on public.business_profiles;
create policy business_profiles_public_read
  on public.business_profiles
  for select
  to anon, authenticated
  using (true);

comment on policy business_profiles_public_read on public.business_profiles
  is 'All business profile records can resolve through a public miniweb; directory and verification are separate visibility states.';
