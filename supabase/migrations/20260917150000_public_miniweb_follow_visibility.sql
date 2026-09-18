-- Public Miniwebs show community counts and a small public list of followers/following.
-- Only relationship ids and joined public profile fields are selected by the frontend;
-- private account fields remain protected by the profiles table policies.
drop policy if exists profile_follows_public_read on public.profile_follows;
create policy profile_follows_public_read on public.profile_follows
for select to anon, authenticated using (true);

grant select on public.profile_follows to anon, authenticated;
