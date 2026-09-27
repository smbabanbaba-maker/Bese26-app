-- Add one-level replies and likes to comments attached to seller feedback.
-- Only public aggregate counts are exposed; individual liker identities stay private.

alter table public.review_comments
  add column if not exists parent_comment_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.review_comments'::regclass
      and conname = 'review_comments_id_review_key'
  ) then
    alter table public.review_comments
      add constraint review_comments_id_review_key unique (id, review_id);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.review_comments'::regclass
      and conname = 'review_comments_parent_same_review_fkey'
  ) then
    alter table public.review_comments
      add constraint review_comments_parent_same_review_fkey
      foreign key (parent_comment_id, review_id)
      references public.review_comments (id, review_id)
      on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.review_comments'::regclass
      and conname = 'review_comments_parent_not_self_check'
  ) then
    alter table public.review_comments
      add constraint review_comments_parent_not_self_check
      check (parent_comment_id is null or parent_comment_id <> id);
  end if;
end;
$$;

create index if not exists review_comments_parent_idx
  on public.review_comments (parent_comment_id, created_at asc)
  where parent_comment_id is not null;

-- Keep feedback threads one reply deep, and permit replies only to a visible
-- top-level comment on a published seller review.
drop policy if exists review_comments_user_insert on public.review_comments;
create policy review_comments_user_insert on public.review_comments
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.reviews r
    where r.id = review_comments.review_id and r.status = 'published'
  )
  and (
    parent_comment_id is null
    or exists (
      select 1 from public.review_comments parent
      where parent.id = review_comments.parent_comment_id
        and parent.review_id = review_comments.review_id
        and parent.parent_comment_id is null
        and parent.status = 'published'
    )
  )
);

drop policy if exists review_comments_user_update_pending on public.review_comments;
create policy review_comments_user_update_pending on public.review_comments
for update to authenticated
using (user_id = (select auth.uid()) and status = 'pending')
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and (
    parent_comment_id is null
    or exists (
      select 1 from public.review_comments parent
      where parent.id = review_comments.parent_comment_id
        and parent.review_id = review_comments.review_id
        and parent.parent_comment_id is null
        and parent.status = 'published'
    )
  )
);

create table if not exists public.review_comment_likes (
  comment_id uuid not null references public.review_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists review_comment_likes_user_idx
  on public.review_comment_likes (user_id, comment_id);

alter table public.review_comment_likes enable row level security;

drop policy if exists review_comment_likes_read_own on public.review_comment_likes;
create policy review_comment_likes_read_own on public.review_comment_likes
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists review_comment_likes_insert_own on public.review_comment_likes;
create policy review_comment_likes_insert_own on public.review_comment_likes
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.review_comments c
    join public.reviews r on r.id = c.review_id
    where c.id = review_comment_likes.comment_id
      and c.status = 'published'
      and r.status = 'published'
  )
);

drop policy if exists review_comment_likes_delete_own on public.review_comment_likes;
create policy review_comment_likes_delete_own on public.review_comment_likes
for delete to authenticated
using (user_id = (select auth.uid()));

grant select, insert, delete on public.review_comment_likes to authenticated;

-- Public view returns only counts for comments belonging to published reviews.
create or replace view public.review_comment_social_counts as
select
  c.id as comment_id,
  coalesce(l.like_count, 0)::integer as like_count,
  coalesce(r.reply_count, 0)::integer as reply_count
from public.review_comments c
join public.reviews rv on rv.id = c.review_id and rv.status = 'published'
left join (
  select comment_id, count(*)::integer as like_count
  from public.review_comment_likes
  group by comment_id
) l on l.comment_id = c.id
left join (
  select child.parent_comment_id, count(*)::integer as reply_count
  from public.review_comments child
  join public.review_comments parent on parent.id = child.parent_comment_id
  where child.status = 'published'
    and parent.status = 'published'
    and parent.parent_comment_id is null
  group by child.parent_comment_id
) r on r.parent_comment_id = c.id
where c.status = 'published';

grant select on public.review_comment_social_counts to anon, authenticated;
