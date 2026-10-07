-- Repair listing photo uploads for authenticated sellers.
-- The client path is: <seller_id>/<listing_id>/<file_name>.

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
  on conflict (id) do update set
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;
end;
$$;

-- Keep public reads for approved marketplace photos.
drop policy if exists public_marketplace_media_read on storage.objects;
create policy public_marketplace_media_read
on storage.objects for select to anon, authenticated
using (bucket_id = 'listing-media');

-- Owner-only write policy. It validates both path folders and the listing owner,
-- without depending on an older helper function or migration order.
drop policy if exists listing_media_object_insert on storage.objects;
create policy listing_media_object_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.listings l
    where l.id::text = (storage.foldername(name))[2]
      and l.seller_id = auth.uid()
  )
);

drop policy if exists listing_media_object_update on storage.objects;
create policy listing_media_object_update
on storage.objects for update to authenticated
using (bucket_id = 'listing-media' and owner_id = auth.uid()::text)
with check (bucket_id = 'listing-media' and owner_id = auth.uid()::text);

drop policy if exists listing_media_object_delete on storage.objects;
create policy listing_media_object_delete
on storage.objects for delete to authenticated
using (bucket_id = 'listing-media' and owner_id = auth.uid()::text);
