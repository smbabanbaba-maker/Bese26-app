-- Bese26: controlled moderation roles and real moderation notifications.
-- No new user is assigned a moderator role by this migration.

alter table public.profiles
drop constraint if exists profiles_app_role_check;

alter table public.profiles
add constraint profiles_app_role_check check (app_role in ('user', 'moderator', 'admin'));

-- Keep app_role outside ordinary profile self-service updates.
revoke insert, update on public.profiles from authenticated;
grant insert (id, username, display_name, avatar_path, bio, city, state, country) on public.profiles to authenticated;
grant update (username, display_name, avatar_path, bio, city, state, country) on public.profiles to authenticated;

create or replace function private.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role in ('moderator', 'admin')
  );
$$;

revoke all on function private.is_moderator_or_admin() from public;
grant execute on function private.is_moderator_or_admin() to authenticated;

create or replace function public.current_user_can_moderate()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role in ('moderator', 'admin')
  );
$$;

revoke all on function public.current_user_can_moderate() from public, anon;
grant execute on function public.current_user_can_moderate() to authenticated;

-- Moderators and admins can read the review queue and its audit history.
drop policy if exists listings_admin_pending_read on public.listings;
create policy listings_admin_pending_read on public.listings
for select to authenticated
using (
  private.is_moderator_or_admin()
  and status = 'pending'
  and moderation_status = 'pending'
);

drop policy if exists listing_media_admin_pending_read on public.listing_media;
create policy listing_media_admin_pending_read on public.listing_media
for select to authenticated
using (
  private.is_moderator_or_admin()
  and exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.status = 'pending'
      and l.moderation_status = 'pending'
  )
);

drop policy if exists listing_moderation_events_admin_read on public.listing_moderation_events;
create policy listing_moderation_events_admin_read on public.listing_moderation_events
for select to authenticated
using (private.is_moderator_or_admin());

create or replace function private.admin_can_read_listing_storage_path(p_name text)
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
  if not private.is_moderator_or_admin() then return false; end if;
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
      and l.status = 'pending'
      and l.moderation_status = 'pending'
  );
end;
$$;

revoke all on function private.admin_can_read_listing_storage_path(text) from public;
grant execute on function private.admin_can_read_listing_storage_path(text) to authenticated;

drop policy if exists listing_media_object_admin_read on storage.objects;
create policy listing_media_object_admin_read on storage.objects
for select to authenticated
using (bucket_id = 'listing-media' and private.admin_can_read_listing_storage_path(name));

create or replace function public.moderate_listing(
  p_listing_id uuid,
  p_action text,
  p_rejection_reason text default null
)
returns public.listings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  updated_listing public.listings;
  normalized_reason text := nullif(trim(coalesce(p_rejection_reason, '')), '');
begin
  if not private.is_moderator_or_admin() then
    raise exception using errcode = '42501', message = 'Moderator access required';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'Moderation action must be approve or reject';
  end if;

  if p_action = 'reject' and normalized_reason is null then
    raise exception using errcode = '22023', message = 'A rejection reason is required';
  end if;

  if p_action = 'approve' then
    update public.listings
    set status = 'active',
        moderation_status = 'approved',
        rejection_reason = null,
        published_at = coalesce(published_at, timezone('utc', now()))
    where id = p_listing_id
      and status = 'pending'
      and moderation_status = 'pending'
    returning * into updated_listing;
  else
    update public.listings
    set status = 'rejected',
        moderation_status = 'rejected',
        rejection_reason = normalized_reason
    where id = p_listing_id
      and status = 'pending'
      and moderation_status = 'pending'
    returning * into updated_listing;
  end if;

  if updated_listing.id is null then
    raise exception using errcode = 'P0002', message = 'Pending listing was not found or was already reviewed';
  end if;

  insert into public.listing_moderation_events (listing_id, admin_id, action, rejection_reason)
  values (updated_listing.id, auth.uid(), p_action, normalized_reason);

  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (
    updated_listing.seller_id,
    auth.uid(),
    'listing_moderated',
    case when p_action = 'approve' then 'Your listing is now live' else 'Your listing needs changes' end,
    case when p_action = 'approve'
      then 'Your listing has passed review and is now visible on bese26.'
      else 'Review feedback: ' || normalized_reason
    end,
    jsonb_build_object('listing_id', updated_listing.id, 'action', p_action)
  );

  return updated_listing;
end;
$$;

revoke all on function public.moderate_listing(uuid, text, text) from public, anon;
grant execute on function public.moderate_listing(uuid, text, text) to authenticated;
