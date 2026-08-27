-- Bese26 security remediation: keep trigger/RLS helper functions out of the exposed public API schema.

create schema if not exists private;
revoke all on schema private from public;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists seed_conversation_participants_trigger on public.conversations;
drop trigger if exists touch_conversation_from_message_trigger on public.messages;
drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists profile_contacts_updated_at on public.profile_contacts;
drop trigger if exists categories_updated_at on public.categories;
drop trigger if exists category_fields_updated_at on public.category_fields;
drop trigger if exists listings_updated_at on public.listings;
drop trigger if exists listing_media_updated_at on public.listing_media;
drop trigger if exists drafts_updated_at on public.listing_drafts;
drop trigger if exists conversations_updated_at on public.conversations;
drop trigger if exists reviews_updated_at on public.reviews;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    nullif(lower(coalesce(new.raw_user_meta_data ->> 'username', '')), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'bese26 user'), '@', 1))
  )
  on conflict (id) do update set display_name = excluded.display_name, updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function private.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

create or replace function private.user_owns_listing_storage_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  folders text[];
  listing_uuid uuid;
begin
  folders := storage.foldername(p_name);
  if coalesce(array_length(folders, 1), 0) < 2 then return false; end if;
  if folders[1] <> auth.uid()::text then return false; end if;
  begin
    listing_uuid := folders[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return exists (select 1 from public.listings l where l.id = listing_uuid and l.seller_id = auth.uid());
end;
$$;

create or replace function private.is_public_listing_storage_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
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

create or replace function private.seed_conversation_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.conversation_participants (conversation_id, user_id, participant_role)
  values (new.id, new.buyer_id, 'buyer'), (new.id, new.seller_id, 'seller')
  on conflict (conversation_id, user_id) do nothing;
  return new;
end;
$$;

create or replace function private.touch_conversation_from_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at, updated_at = timezone('utc', now())
  where id = new.conversation_id;
  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  select cp.user_id, new.sender_id, 'new_message', 'New message', left(coalesce(new.body, 'You received an attachment.'), 160), jsonb_build_object('conversation_id', new.conversation_id)
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id and cp.user_id <> new.sender_id;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();
create trigger seed_conversation_participants_trigger after insert on public.conversations for each row execute procedure private.seed_conversation_participants();
create trigger touch_conversation_from_message_trigger after insert on public.messages for each row execute procedure private.touch_conversation_from_message();
create trigger profiles_updated_at before update on public.profiles for each row execute procedure private.set_updated_at();
create trigger profile_contacts_updated_at before update on public.profile_contacts for each row execute procedure private.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute procedure private.set_updated_at();
create trigger category_fields_updated_at before update on public.category_fields for each row execute procedure private.set_updated_at();
create trigger listings_updated_at before update on public.listings for each row execute procedure private.set_updated_at();
create trigger listing_media_updated_at before update on public.listing_media for each row execute procedure private.set_updated_at();
create trigger drafts_updated_at before update on public.listing_drafts for each row execute procedure private.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute procedure private.set_updated_at();
create trigger reviews_updated_at before update on public.reviews for each row execute procedure private.set_updated_at();

drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read on public.messages for select to authenticated using (private.is_conversation_participant(conversation_id));
drop policy if exists messages_participant_insert on public.messages;
create policy messages_participant_insert on public.messages for insert to authenticated with check (sender_id = auth.uid() and private.is_conversation_participant(conversation_id));

drop policy if exists listing_media_object_insert on storage.objects;
create policy listing_media_object_insert on storage.objects for insert to authenticated with check (bucket_id = 'listing-media' and private.user_owns_listing_storage_path(name));
drop policy if exists listing_media_object_read on storage.objects;
create policy listing_media_object_read on storage.objects for select to anon, authenticated using (bucket_id = 'listing-media' and (private.is_public_listing_storage_path(name) or owner_id = auth.uid()::text));

drop function if exists public.set_updated_at();
drop function if exists public.handle_new_user();
drop function if exists public.is_conversation_participant(uuid);
drop function if exists public.user_owns_listing_storage_path(text);
drop function if exists public.is_public_listing_storage_path(text);
drop function if exists public.seed_conversation_participants();
drop function if exists public.touch_conversation_from_message();
