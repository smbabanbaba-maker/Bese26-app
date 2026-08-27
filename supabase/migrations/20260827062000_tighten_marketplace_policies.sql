-- Bese26 policy tightening: sellers submit pending listings; buyers may chat only about approved listings.

drop policy if exists listings_owner_insert on public.listings;
create policy listings_owner_insert on public.listings
for insert to authenticated
with check (
  seller_id = auth.uid()
  and status = 'pending'
  and moderation_status = 'pending'
);

drop policy if exists listings_owner_update on public.listings;
create policy listings_owner_update on public.listings
for update to authenticated
using (seller_id = auth.uid())
with check (
  seller_id = auth.uid()
  and moderation_status = 'pending'
  and status in ('draft', 'pending', 'paused', 'sold', 'archived')
);

drop policy if exists conversations_participant_insert on public.conversations;
create policy conversations_participant_insert on public.conversations
for insert to authenticated
with check (
  buyer_id = auth.uid()
  and buyer_id <> seller_id
  and listing_id is not null
  and exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.seller_id = seller_id
      and l.status = 'active'
      and l.moderation_status = 'approved'
  )
);

drop policy if exists reviews_reviewer_insert on public.reviews;
create policy reviews_reviewer_insert on public.reviews
for insert to authenticated
with check (
  reviewer_id = auth.uid()
  and reviewer_id <> reviewee_id
  and exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.seller_id = reviewee_id
      and l.status in ('sold', 'archived')
  )
);
