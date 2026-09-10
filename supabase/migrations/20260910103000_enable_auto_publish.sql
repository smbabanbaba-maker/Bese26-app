-- Bese26 optional auto-publish mode requested by the owner.
-- New listings are created by the trusted authenticated seller flow and become
-- visible immediately after the client marks them active.

drop policy if exists listings_owner_insert on public.listings;
create policy listings_owner_insert on public.listings
for insert to authenticated
with check (
  seller_id = auth.uid()
  and status in ('pending', 'active')
  and moderation_status in ('pending', 'approved')
);

drop policy if exists listings_owner_update on public.listings;
create policy listings_owner_update on public.listings
for update to authenticated
using (seller_id = auth.uid())
with check (
  seller_id = auth.uid()
  and status in ('draft', 'pending', 'active', 'paused', 'sold', 'archived')
  and moderation_status in ('pending', 'approved')
);
