-- Social interactions for published seller reviews.
-- Additive only: user identities stay private; only aggregate counts are public.

create table if not exists public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index if not exists review_likes_user_idx
  on public.review_likes (user_id, review_id);

alter table public.review_likes enable row level security;

drop policy if exists review_likes_read_own on public.review_likes;
create policy review_likes_read_own on public.review_likes
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists review_likes_insert_own on public.review_likes;
create policy review_likes_insert_own on public.review_likes
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.reviews r
    where r.id = review_id and r.status = 'published'
  )
);

drop policy if exists review_likes_delete_own on public.review_likes;
create policy review_likes_delete_own on public.review_likes
for delete to authenticated
using (user_id = (select auth.uid()));

grant select, insert, delete on public.review_likes to authenticated;

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  status text not null default 'published' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists review_comments_review_idx
  on public.review_comments (review_id, status, created_at desc);

create index if not exists review_comments_user_idx
  on public.review_comments (user_id, created_at desc);

alter table public.review_comments enable row level security;

drop policy if exists review_comments_public_read on public.review_comments;
create policy review_comments_public_read on public.review_comments
for select to anon, authenticated
using (status = 'published' or user_id = (select auth.uid()));

drop policy if exists review_comments_moderator_read on public.review_comments;
create policy review_comments_moderator_read on public.review_comments
for select to authenticated
using (public.current_user_can_moderate());

drop policy if exists review_comments_user_insert on public.review_comments;
create policy review_comments_user_insert on public.review_comments
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.reviews r
    where r.id = review_id and r.status = 'published'
  )
);

drop policy if exists review_comments_user_update_pending on public.review_comments;
create policy review_comments_user_update_pending on public.review_comments
for update to authenticated
using (user_id = (select auth.uid()) and status = 'pending')
with check (user_id = (select auth.uid()) and status = 'pending');

drop policy if exists review_comments_moderator_update on public.review_comments;
create policy review_comments_moderator_update on public.review_comments
for update to authenticated
using (public.current_user_can_moderate())
with check (public.current_user_can_moderate());

drop policy if exists review_comments_delete_own_or_moderator on public.review_comments;
create policy review_comments_delete_own_or_moderator on public.review_comments
for delete to authenticated
using (user_id = (select auth.uid()) or public.current_user_can_moderate());

grant select on public.review_comments to anon, authenticated;
grant insert, update, delete on public.review_comments to authenticated;

drop trigger if exists review_comments_updated_at on public.review_comments;
create trigger review_comments_updated_at
before update on public.review_comments
for each row execute procedure public.set_updated_at();

-- This view exposes review IDs and aggregate counts only, never the user IDs
-- stored in review_likes. It is limited to published reviews.
create or replace view public.review_social_counts as
select
  r.id as review_id,
  coalesce(l.like_count, 0)::integer as like_count,
  coalesce(c.comment_count, 0)::integer as comment_count
from public.reviews r
left join (
  select review_id, count(*)::integer as like_count
  from public.review_likes
  group by review_id
) l on l.review_id = r.id
left join (
  select review_id, count(*)::integer as comment_count
  from public.review_comments
  where status = 'published'
  group by review_id
) c on c.review_id = r.id
where r.status = 'published';

grant select on public.review_social_counts to anon, authenticated;
