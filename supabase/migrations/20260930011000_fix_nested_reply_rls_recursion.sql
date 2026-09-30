-- Avoid querying listing_comments from its own RLS policy. The helper runs as
-- the database owner and only returns a boolean parent-validity result.
create or replace function public.can_attach_listing_comment_reply(
  p_parent_comment_id uuid,
  p_listing_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listing_comments parent
    where parent.id = p_parent_comment_id
      and parent.listing_id = p_listing_id
      and parent.status = 'published'
  );
$$;

revoke all on function public.can_attach_listing_comment_reply(uuid, uuid) from public, anon;
grant execute on function public.can_attach_listing_comment_reply(uuid, uuid) to authenticated;

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
    or public.can_attach_listing_comment_reply(parent_comment_id, listing_id)
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
    or public.can_attach_listing_comment_reply(parent_comment_id, listing_id)
  )
);

notify pgrst, 'reload schema';
