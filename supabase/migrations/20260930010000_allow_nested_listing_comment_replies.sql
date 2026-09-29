-- Allow a public discussion to continue at any depth, while keeping replies inside
-- the same approved listing and requiring the parent to be published.
drop policy if exists listing_comments_user_insert on public.listing_comments;
create policy listing_comments_user_insert on public.listing_comments
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.listings l
    where l.id = listing_comments.listing_id
      and l.status in ('active', 'sold', 'archived')
      and l.moderation_status = 'approved'
  )
  and (
    parent_comment_id is null
    or exists (
      select 1 from public.listing_comments parent
      where parent.id = listing_comments.parent_comment_id
        and parent.listing_id = listing_comments.listing_id
        and parent.status = 'published'
    )
  )
);

drop policy if exists listing_comments_user_update on public.listing_comments;
create policy listing_comments_user_update on public.listing_comments
for update to authenticated
using (user_id = (select auth.uid()) and status = 'pending')
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and (
    parent_comment_id is null
    or exists (
      select 1 from public.listing_comments parent
      where parent.id = listing_comments.parent_comment_id
        and parent.listing_id = listing_comments.listing_id
        and parent.status = 'published'
    )
  )
);

notify pgrst, 'reload schema';
