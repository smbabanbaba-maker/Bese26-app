-- Bese26 admin moderation: only designated admin profiles can review pending listings.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

alter table public.profiles
  add column if not exists app_role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_app_role_check;

alter table public.profiles
  add constraint profiles_app_role_check check (app_role in ('user', 'admin'));

create table if not exists public.listing_moderation_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('approve', 'reject')),
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.listing_moderation_events enable row level security;

create or replace function private.is_admin()
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
      and app_role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;

-- The user explicitly selected this existing account as the first admin.
update public.profiles
set app_role = 'admin'
where id in (
  select id from auth.users where lower(email) = 'smbabanbaba@gmail.com'
);

drop policy if exists listings_admin_pending_read on public.listings;
create policy listings_admin_pending_read on public.listings
for select to authenticated
using (
  private.is_admin()
  and status = 'pending'
  and moderation_status = 'pending'
);

drop policy if exists listing_media_admin_pending_read on public.listing_media;
create policy listing_media_admin_pending_read on public.listing_media
for select to authenticated
using (
  private.is_admin()
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
using (private.is_admin());

-- Allow admins to read pending objects in the private listing-media bucket.
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
  if not private.is_admin() then return false; end if;
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
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'Moderation action must be approve or reject';
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

  return updated_listing;
end;
$$;

revoke all on function public.moderate_listing(uuid, text, text) from public, anon;
grant execute on function public.moderate_listing(uuid, text, text) to authenticated;
