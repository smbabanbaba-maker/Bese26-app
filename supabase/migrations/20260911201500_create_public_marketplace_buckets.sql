-- Repair production environments where the marketplace tables exist but the
-- original storage bucket creation block was not rolled out.

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'listing-media',
    'listing-media',
    true,
    10485760,
    array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']::text[]
  )
  on conflict (id) do update
    set public = true,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg','image/png','image/webp']::text[]
  )
  on conflict (id) do update
    set public = true,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
end;
$$;

drop policy if exists public_marketplace_media_read on storage.objects;
create policy public_marketplace_media_read
on storage.objects
for select
to anon, authenticated
using (bucket_id in ('listing-media', 'avatars'));
