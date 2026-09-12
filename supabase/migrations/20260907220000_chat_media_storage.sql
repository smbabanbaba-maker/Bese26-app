-- Private storage for participant-only chat images and voice notes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 8388608, array['image/jpeg','image/png','image/webp','image/gif','application/pdf','audio/webm','audio/ogg','audio/mp4','audio/mpeg']::text[])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists chat_media_insert on storage.objects;
create policy chat_media_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and private.is_conversation_participant(((storage.foldername(name))[2])::uuid)
);

drop policy if exists chat_media_read on storage.objects;
create policy chat_media_read on storage.objects
for select to authenticated
using (
  bucket_id = 'chat-media'
  and private.is_conversation_participant(((storage.foldername(name))[2])::uuid)
);

drop policy if exists chat_media_delete on storage.objects;
create policy chat_media_delete on storage.objects
for delete to authenticated
using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
