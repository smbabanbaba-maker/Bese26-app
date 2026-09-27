-- Add likes and one-level replies to public listing comments.
-- Liker identities remain private; public users receive aggregate counts only.

alter table public.listing_comments
  add column if not exists parent_comment_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listing_comments'::regclass
      and conname = 'listing_comments_id_listing_key'
  ) then
    alter table public.listing_comments
      add constraint listing_comments_id_listing_key unique (id, listing_id);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listing_comments'::regclass
      and conname = 'listing_comments_parent_same_listing_fkey'
  ) then
    alter table public.listing_comments
      add constraint listing_comments_parent_same_listing_fkey
      foreign key (parent_comment_id, listing_id)
      references public.listing_comments (id, listing_id)
      on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listing_comments'::regclass
      and conname = 'listing_comments_parent_not_self_check'
  ) then
    alter table public.listing_comments
      add constraint listing_comments_parent_not_self_check
      check (parent_comment_id is null or parent_comment_id <> id);
  end if;
end;
$$;

create index if not exists listing_comments_parent_idx
  on public.listing_comments (parent_comment_id, created_at asc)
  where parent_comment_id is not null;

-- Replies must belong to the same approved listing and attach to a visible root comment.
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
        and parent.parent_comment_id is null
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
        and parent.parent_comment_id is null
        and parent.status = 'published'
    )
  )
);

create table if not exists public.listing_comment_likes (
  comment_id uuid not null references public.listing_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists listing_comment_likes_user_idx
  on public.listing_comment_likes (user_id, comment_id);

alter table public.listing_comment_likes enable row level security;

revoke all on table public.listing_comment_likes from anon;
grant select, insert, delete on table public.listing_comment_likes to authenticated;

drop policy if exists listing_comment_likes_read_own on public.listing_comment_likes;
create policy listing_comment_likes_read_own on public.listing_comment_likes
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists listing_comment_likes_insert_own on public.listing_comment_likes;
create policy listing_comment_likes_insert_own on public.listing_comment_likes
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.listing_comments c
    join public.listings l on l.id = c.listing_id
    where c.id = listing_comment_likes.comment_id
      and c.status = 'published'
      and l.status in ('active', 'sold', 'archived')
      and l.moderation_status = 'approved'
  )
);

drop policy if exists listing_comment_likes_delete_own on public.listing_comment_likes;
create policy listing_comment_likes_delete_own on public.listing_comment_likes
for delete to authenticated
using (user_id = (select auth.uid()));

create or replace view public.listing_comment_social_counts as
select
  c.id as comment_id,
  coalesce(l.like_count, 0)::integer as like_count,
  coalesce(r.reply_count, 0)::integer as reply_count
from public.listing_comments c
join public.listings listing on listing.id = c.listing_id
  and listing.status in ('active', 'sold', 'archived')
  and listing.moderation_status = 'approved'
left join (
  select comment_id, count(*)::integer as like_count
  from public.listing_comment_likes
  group by comment_id
) l on l.comment_id = c.id
left join (
  select child.parent_comment_id, count(*)::integer as reply_count
  from public.listing_comments child
  join public.listing_comments parent on parent.id = child.parent_comment_id
  where child.status = 'published'
    and parent.status = 'published'
    and parent.parent_comment_id is null
  group by child.parent_comment_id
) r on r.parent_comment_id = c.id
where c.status = 'published';

grant select on public.listing_comment_social_counts to anon, authenticated;
