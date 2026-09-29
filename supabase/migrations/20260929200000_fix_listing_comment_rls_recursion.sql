-- Fix recursive RLS evaluation when posting listing comments and replies.
-- The parent-comment lookup is isolated in a security-definer helper so the
-- listing_comments policy does not query listing_comments through itself.

create or replace function public.can_post_listing_comment(
  p_listing_id uuid,
  p_parent_comment_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings l
    where l.id = p_listing_id
      and l.status in ('active', 'sold', 'archived')
      and l.moderation_status = 'approved'
  )
  and (
    p_parent_comment_id is null
    or exists (
      select 1
      from public.listing_comments parent
      where parent.id = p_parent_comment_id
        and parent.listing_id = p_listing_id
        and parent.parent_comment_id is null
        and parent.status = 'published'
    )
  );
$$;

revoke all on function public.can_post_listing_comment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.can_post_listing_comment(uuid, uuid) to authenticated;

drop policy if exists listing_comments_user_insert on public.listing_comments;
create policy listing_comments_user_insert on public.listing_comments
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.can_post_listing_comment(listing_id, parent_comment_id)
);

drop policy if exists listing_comments_user_update on public.listing_comments;
create policy listing_comments_user_update on public.listing_comments
for update to authenticated
using (user_id = (select auth.uid()) and status = 'pending')
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and public.can_post_listing_comment(listing_id, parent_comment_id)
);

notify pgrst, 'reload schema';
