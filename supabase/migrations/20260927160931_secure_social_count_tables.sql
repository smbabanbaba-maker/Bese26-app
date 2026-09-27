-- Replace SECURITY DEFINER aggregate views for seller feedback with counts-only tables.
-- Public users can read aggregates only; liker identities remain behind their own-row RLS.
-- Also keep listing comment counts in sync when a listing's public visibility changes.

drop view if exists public.review_social_counts;
drop view if exists public.review_comment_social_counts;

create table if not exists public.review_social_counts (
  review_id uuid primary key references public.reviews (id) on delete cascade,
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0)
);

create table if not exists public.review_comment_social_counts (
  comment_id uuid primary key references public.review_comments (id) on delete cascade,
  like_count integer not null default 0 check (like_count >= 0),
  reply_count integer not null default 0 check (reply_count >= 0)
);

alter table public.review_social_counts enable row level security;
alter table public.review_comment_social_counts enable row level security;
revoke all on table public.review_social_counts from public, anon, authenticated;
revoke all on table public.review_comment_social_counts from public, anon, authenticated;
grant select on table public.review_social_counts to anon, authenticated;
grant select on table public.review_comment_social_counts to anon, authenticated;

drop policy if exists review_social_counts_public_read on public.review_social_counts;
create policy review_social_counts_public_read on public.review_social_counts
for select to anon, authenticated
using (exists (
  select 1 from public.reviews r
  where r.id = review_social_counts.review_id and r.status = 'published'
));

drop policy if exists review_comment_social_counts_public_read on public.review_comment_social_counts;
create policy review_comment_social_counts_public_read on public.review_comment_social_counts
for select to anon, authenticated
using (exists (
  select 1
  from public.review_comments c
  join public.reviews r on r.id = c.review_id
  where c.id = review_comment_social_counts.comment_id
    and c.status = 'published'
    and r.status = 'published'
));

create or replace function public.refresh_review_social_counts(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_review_id is null then
    return;
  end if;

  insert into public.review_social_counts (review_id, like_count, comment_count)
  select
    r.id,
    (select count(*)::integer from public.review_likes l where l.review_id = r.id),
    (select count(*)::integer from public.review_comments c where c.review_id = r.id and c.status = 'published')
  from public.reviews r
  where r.id = p_review_id and r.status = 'published'
  on conflict (review_id) do update
  set like_count = excluded.like_count,
      comment_count = excluded.comment_count;

  if not found then
    delete from public.review_social_counts where review_id = p_review_id;
  end if;
end;
$$;

create or replace function public.refresh_review_comment_social_counts(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_comment_id is null then
    return;
  end if;

  insert into public.review_comment_social_counts (comment_id, like_count, reply_count)
  select
    c.id,
    (select count(*)::integer from public.review_comment_likes l where l.comment_id = c.id),
    (select count(*)::integer from public.review_comments child where child.parent_comment_id = c.id and child.status = 'published')
  from public.review_comments c
  join public.reviews r on r.id = c.review_id and r.status = 'published'
  where c.id = p_comment_id and c.status = 'published'
  on conflict (comment_id) do update
  set like_count = excluded.like_count,
      reply_count = excluded.reply_count;

  if not found then
    delete from public.review_comment_social_counts where comment_id = p_comment_id;
  end if;
end;
$$;

create or replace function public.handle_review_social_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review_id uuid;
  v_comment_id uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.review_social_counts where review_id = old.id;
    for v_comment_id in select c.id from public.review_comments c where c.review_id = old.id loop
      perform public.refresh_review_comment_social_counts(v_comment_id);
    end loop;
    return old;
  end if;

  perform public.refresh_review_social_counts(new.id);
  for v_comment_id in select c.id from public.review_comments c where c.review_id = new.id loop
    perform public.refresh_review_comment_social_counts(v_comment_id);
  end loop;
  return new;
end;
$$;

create or replace function public.handle_review_comment_social_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_review_social_counts(old.review_id);
    delete from public.review_comment_social_counts where comment_id = old.id;
    if old.parent_comment_id is not null then
      perform public.refresh_review_comment_social_counts(old.parent_comment_id);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.review_id is distinct from new.review_id then
    perform public.refresh_review_social_counts(old.review_id);
  end if;
  if tg_op = 'UPDATE' and old.parent_comment_id is distinct from new.parent_comment_id then
    perform public.refresh_review_comment_social_counts(old.parent_comment_id);
  end if;

  perform public.refresh_review_social_counts(new.review_id);
  perform public.refresh_review_comment_social_counts(new.id);
  if new.parent_comment_id is not null then
    perform public.refresh_review_comment_social_counts(new.parent_comment_id);
  end if;
  return new;
end;
$$;

create or replace function public.handle_review_like_social_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_review_social_counts(old.review_id);
    return old;
  end if;
  perform public.refresh_review_social_counts(new.review_id);
  return new;
end;
$$;

create or replace function public.handle_review_comment_like_social_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_review_comment_social_counts(old.comment_id);
    return old;
  end if;
  perform public.refresh_review_comment_social_counts(new.comment_id);
  return new;
end;
$$;

create or replace function public.handle_listing_comment_count_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comment_id uuid;
begin
  if new.status in ('active', 'sold', 'archived') and new.moderation_status = 'approved' then
    for v_comment_id in
      select c.id from public.listing_comments c
      where c.listing_id = new.id and c.status = 'published'
    loop
      perform public.refresh_listing_comment_social_counts(v_comment_id);
    end loop;
  else
    delete from public.listing_comment_social_counts counts
    using public.listing_comments c
    where counts.comment_id = c.id and c.listing_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.refresh_review_social_counts(uuid) from public, anon, authenticated;
revoke all on function public.refresh_review_comment_social_counts(uuid) from public, anon, authenticated;
revoke all on function public.handle_review_social_counts() from public, anon, authenticated;
revoke all on function public.handle_review_comment_social_counts() from public, anon, authenticated;
revoke all on function public.handle_review_like_social_counts() from public, anon, authenticated;
revoke all on function public.handle_review_comment_like_social_counts() from public, anon, authenticated;
revoke all on function public.handle_listing_comment_count_visibility() from public, anon, authenticated;

drop trigger if exists review_social_counts_sync on public.reviews;
create trigger review_social_counts_sync
after insert or update or delete on public.reviews
for each row execute function public.handle_review_social_counts();

drop trigger if exists review_comment_social_counts_sync on public.review_comments;
create trigger review_comment_social_counts_sync
after insert or update or delete on public.review_comments
for each row execute function public.handle_review_comment_social_counts();

drop trigger if exists review_like_social_counts_sync on public.review_likes;
create trigger review_like_social_counts_sync
after insert or delete on public.review_likes
for each row execute function public.handle_review_like_social_counts();

drop trigger if exists review_comment_like_social_counts_sync on public.review_comment_likes;
create trigger review_comment_like_social_counts_sync
after insert or delete on public.review_comment_likes
for each row execute function public.handle_review_comment_like_social_counts();

drop trigger if exists listing_comment_counts_visibility_sync on public.listings;
create trigger listing_comment_counts_visibility_sync
after update of status, moderation_status on public.listings
for each row execute function public.handle_listing_comment_count_visibility();

-- Backfill aggregate rows for records that are public at migration time.
insert into public.review_social_counts (review_id, like_count, comment_count)
select
  r.id,
  (select count(*)::integer from public.review_likes l where l.review_id = r.id),
  (select count(*)::integer from public.review_comments c where c.review_id = r.id and c.status = 'published')
from public.reviews r
where r.status = 'published'
on conflict (review_id) do update
set like_count = excluded.like_count,
    comment_count = excluded.comment_count;

insert into public.review_comment_social_counts (comment_id, like_count, reply_count)
select
  c.id,
  (select count(*)::integer from public.review_comment_likes l where l.comment_id = c.id),
  (select count(*)::integer from public.review_comments child where child.parent_comment_id = c.id and child.status = 'published')
from public.review_comments c
join public.reviews r on r.id = c.review_id and r.status = 'published'
where c.status = 'published'
on conflict (comment_id) do update
set like_count = excluded.like_count,
    reply_count = excluded.reply_count;

notify pgrst, 'reload schema';
