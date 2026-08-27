-- Bese26 storage hardening: only active approved listing media is publicly signable.

update storage.buckets
set public = false
where id = 'listing-media';

create or replace function public.is_public_listing_storage_path(p_name text)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  folders text[];
  listing_uuid uuid;
begin
  folders := storage.foldername(p_name);
  if coalesce(array_length(folders, 1), 0) < 2 then return false; end if;
  begin
    listing_uuid := folders[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return exists (
    select 1 from public.listings l
    where l.id = listing_uuid
      and l.status = 'active'
      and l.moderation_status = 'approved'
  );
end;
$$;

drop policy if exists listing_media_object_read on storage.objects;
create policy listing_media_object_read on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'listing-media'
  and (public.is_public_listing_storage_path(name) or owner_id = auth.uid()::text)
);
