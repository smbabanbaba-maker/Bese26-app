-- Secure business listing team permissions.
-- The owner remains the source of truth; members receive explicit, auditable roles.
create table if not exists public.business_team_members (
  id uuid primary key default gen_random_uuid(),
  business_profile_id uuid not null references public.business_profiles(profile_id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','seller','staff','marketing')),
  assigned_listing_ids uuid[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_profile_id, user_id)
);
create index if not exists business_team_members_user_idx on public.business_team_members(user_id, is_active);
create index if not exists business_team_members_business_idx on public.business_team_members(business_profile_id, is_active);
alter table public.business_team_members enable row level security;

create or replace function public.user_business_listing_role(p_business_profile_id uuid, p_listing_id uuid default null)
returns text language sql stable security definer set search_path = public
as $$
  select case
    when bp.profile_id = auth.uid() then 'owner'
    else (
      select m.role from public.business_team_members m
      where m.business_profile_id = p_business_profile_id
        and m.user_id = auth.uid()
        and m.is_active
        and (m.role in ('admin','marketing','staff') or p_listing_id is null or cardinality(m.assigned_listing_ids) = 0 or p_listing_id = any(m.assigned_listing_ids))
      limit 1
    )
  end
  from public.business_profiles bp
  where bp.profile_id = p_business_profile_id;
$$;
revoke all on function public.user_business_listing_role(uuid, uuid) from public;
grant execute on function public.user_business_listing_role(uuid, uuid) to authenticated;

create policy business_team_members_self_or_owner_read on public.business_team_members
  for select to authenticated using (user_id = auth.uid() or business_profile_id = auth.uid());
create policy business_team_members_owner_manage on public.business_team_members
  for all to authenticated using (business_profile_id = auth.uid()) with check (business_profile_id = auth.uid());
grant select on public.business_team_members to authenticated;
grant insert, update, delete on public.business_team_members to authenticated;

-- Replace seller-only mutation policies with owner-or-authorized-business policies.
drop policy if exists listings_public_or_owner_read on public.listings;
create policy listings_public_or_owner_read on public.listings for select to anon, authenticated
using ((status = 'active' and moderation_status = 'approved') or seller_id = auth.uid() or public.user_business_listing_role(business_profile_id, id) is not null);
drop policy if exists listings_owner_update on public.listings;
create policy listings_owner_update on public.listings for update to authenticated
using (seller_id = auth.uid() or public.user_business_listing_role(business_profile_id, id) in ('owner','admin','manager','seller'))
with check (seller_id = auth.uid() or public.user_business_listing_role(business_profile_id, id) in ('owner','admin','manager','seller'));
drop policy if exists listings_owner_delete on public.listings;
create policy listings_owner_delete on public.listings for delete to authenticated
using (seller_id = auth.uid() or public.user_business_listing_role(business_profile_id, id) in ('owner','admin'));
drop policy if exists listing_media_owner_insert on public.listing_media;
create policy listing_media_owner_insert on public.listing_media for insert to authenticated
with check (owner_id = auth.uid() and exists (select 1 from public.listings l where l.id = listing_id and (l.seller_id = auth.uid() or public.user_business_listing_role(l.business_profile_id, l.id) in ('owner','admin','manager','seller'))));
drop policy if exists listing_media_owner_delete on public.listing_media;
create policy listing_media_owner_delete on public.listing_media for delete to authenticated
using (owner_id = auth.uid() or exists (select 1 from public.listings l where l.id = listing_id and public.user_business_listing_role(l.business_profile_id, l.id) in ('owner','admin','manager','seller')));
drop policy if exists listing_media_public_or_owner_read on public.listing_media;
create policy listing_media_public_or_owner_read on public.listing_media for select to anon, authenticated
using (exists (select 1 from public.listings l where l.id = listing_id and ((l.status = 'active' and l.moderation_status = 'approved') or l.seller_id = auth.uid() or public.user_business_listing_role(l.business_profile_id, l.id) is not null)));
