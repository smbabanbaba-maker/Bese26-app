-- Bese26 public media rollout.
-- Listing photos, profile avatars, and business logos are public marketplace
-- content. Identity/KYC documents and chat media remain private.

update storage.buckets
set public = true
where id in ('listing-media', 'avatars');

drop policy if exists public_marketplace_media_read on storage.objects;
create policy public_marketplace_media_read
on storage.objects
for select
to anon, authenticated
using (bucket_id in ('listing-media', 'avatars'));
