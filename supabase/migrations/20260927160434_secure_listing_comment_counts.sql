-- Expose only aggregate comment reactions, without a SECURITY DEFINER view.
-- Counts are maintained by internal trigger functions whose EXECUTE privilege is revoked.

drop view if exists public.listing_comment_social_counts;

create table if not exists public.listing_comment_social_counts (
  comment_id uuid primary key references public.listing_comments (id) on delete cascade,
  like_count integer not null default 0 check (like_count >= 0),
  reply_count integer not null default 0 check (reply_count >= 0)
);

alter table public.listing_comment_social_counts enable row level security;
revoke all on table public.listing_comment_social_counts from anon, authenticated;
grant select on table public.listing_comment_social_counts to anon, authenticated;

drop policy if exists listing_comment_social_counts_public_read on public.listing_comment_social_counts;
create policy listing_comment_social_counts_public_read on public.listing_comment_social_counts
for select to anon, authenticated
using (true);

-- These composite indexes cover the parent foreign keys while preserving fast thread lookups.
create index if not exists listing_comments_parent_listing_idx
  on public.listing_comments (parent_comment_id, listing_id);
create index if not exists review_comments_parent_review_idx
  on public.review_comments (parent_comment_id, review_id);

create or replace function public.refresh_listing_comment_social_counts(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_comment_id is null then
    return;
  end if;

  insert into public.listing_comment_social_counts (comment_id, like_count, reply_count)
  select
    c.id,
    (select count(*)::integer from public.listing_comment_likes like_row where like_row.comment_id = c.id),
    (select count(*)::integer from public.listing_comments reply where reply.parent_comment_id = c.id and reply.status = 'published')
  from public.listing_comments c
  join public.listings l on l.id = c.listing_id
    and l.status in ('active', 'sold', 'archived')
    and l.moderation_status = 'approved'
  where c.id = p_comment_id
    and c.status = 'published'
  on conflict (comment_id) do update
  set like_count = excluded.like_count,
      reply_count = excluded.reply_count;

  if not found then
    delete from public.listing_comment_social_counts where comment_id = p_comment_id;
  end if;
end;
$$;

create or replace function public.handle_listing_comment_social_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.listing_comment_social_counts where comment_id = old.id;
    if old.parent_comment_id is not null then
      perform public.refresh_listing_comment_social_counts(old.parent_comment_id);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.parent_comment_id is distinct from new.parent_comment_id then
    perform public.refresh_listing_comment_social_counts(old.parent_comment_id);
  end if;

  perform public.refresh_listing_comment_social_counts(new.id);
  if new.parent_comment_id is not null then
    perform public.refresh_listing_comment_social_counts(new.parent_comment_id);
  end if;
  return new;
end;
$$;

create or replace function public.handle_listing_comment_like_social_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_listing_comment_social_counts(old.comment_id);
    return old;
  end if;
  perform public.refresh_listing_comment_social_counts(new.comment_id);
  return new;
end;
$$;

revoke all on function public.refresh_listing_comment_social_counts(uuid) from public, anon, authenticated;
revoke all on function public.handle_listing_comment_social_counts() from public, anon, authenticated;
revoke all on function public.handle_listing_comment_like_social_counts() from public, anon, authenticated;

drop trigger if exists listing_comment_social_counts_sync on public.listing_comments;
create trigger listing_comment_social_counts_sync
after insert or update or delete on public.listing_comments
for each row execute function public.handle_listing_comment_social_counts();

drop trigger if exists listing_comment_like_social_counts_sync on public.listing_comment_likes;
create trigger listing_comment_like_social_counts_sync
after insert or delete on public.listing_comment_likes
for each row execute function public.handle_listing_comment_like_social_counts();

-- Backfill counts for comments that were already public before this migration.
insert into public.listing_comment_social_counts (comment_id, like_count, reply_count)
select
  c.id,
  (select count(*)::integer from public.listing_comment_likes like_row where like_row.comment_id = c.id),
  (select count(*)::integer from public.listing_comments reply where reply.parent_comment_id = c.id and reply.status = 'published')
from public.listing_comments c
join public.listings l on l.id = c.listing_id
  and l.status in ('active', 'sold', 'archived')
  and l.moderation_status = 'approved'
where c.status = 'published'
on conflict (comment_id) do update
set like_count = excluded.like_count,
    reply_count = excluded.reply_count;

notify pgrst, 'reload schema';
