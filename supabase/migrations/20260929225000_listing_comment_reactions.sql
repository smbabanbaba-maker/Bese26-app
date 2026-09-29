-- Persist the selected emoji on the existing one-reaction-per-user comment like row.
alter table public.listing_comment_likes
  add column if not exists reaction text not null default '👍';

alter table public.listing_comment_likes
  drop constraint if exists listing_comment_likes_reaction_check;
alter table public.listing_comment_likes
  add constraint listing_comment_likes_reaction_check
  check (reaction in ('👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🙏', '🎉', '💯'));

grant update (reaction) on public.listing_comment_likes to authenticated;

drop policy if exists listing_comment_likes_update_own on public.listing_comment_likes;
create policy listing_comment_likes_update_own on public.listing_comment_likes
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

notify pgrst, 'reload schema';
