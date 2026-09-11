-- Public marketplace media must load for anonymous visitors and shared links.
-- Keep private verification documents separate.
update storage.buckets
set public = true
where id in ('listing-media', 'avatars');

-- Public buckets serve objects through getPublicUrl; upload/update/delete remain
-- protected by the existing authenticated storage policies.
