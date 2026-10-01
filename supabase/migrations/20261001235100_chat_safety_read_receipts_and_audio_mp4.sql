-- Chat safety and mobile voice-note support for Bese26.
-- Blocking either side removes access to old message rows and new chat-media reads/writes.

create or replace function private.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path to public
as $function$
  select exists (
    select 1
    from public.conversation_participants cp
    join public.conversations c on c.id = cp.conversation_id
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
      and not public.users_are_blocked(c.buyer_id, c.seller_id)
  );
$function$;

-- Do not allow the legacy owner-folder policies to bypass conversation membership.
drop policy if exists chat_media_object_insert on storage.objects;
drop policy if exists chat_media_object_read on storage.objects;

-- iOS/Safari commonly records voice notes as audio/mp4; keep the bucket private.
update storage.buckets
set file_size_limit = 12000000,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'
    ]::text[]
where id = 'chat-media';

-- Message reads are written through a narrowly scoped server function instead of
-- granting clients general UPDATE access to message bodies or sender metadata.
create or replace function public.mark_conversation_messages_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path to public, private
as $function$
declare
  v_updated integer := 0;
begin
  if auth.uid() is null or not private.is_conversation_participant(p_conversation_id) then
    raise exception 'Not allowed to update messages in this conversation.' using errcode = '42501';
  end if;

  update public.messages
  set read_at = timezone('utc', now())
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and read_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$function$;

revoke all on function public.mark_conversation_messages_read(uuid) from public, anon;
grant execute on function public.mark_conversation_messages_read(uuid) to authenticated;
