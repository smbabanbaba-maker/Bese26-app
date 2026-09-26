-- Public listing comments: moderated buyer questions and opinions visible to everyone.
create table if not exists public.listing_comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists listing_comments_listing_idx
  on public.listing_comments (listing_id, status, created_at desc);

alter table public.listing_comments enable row level security;

drop policy if exists listing_comments_public_read on public.listing_comments;
create policy listing_comments_public_read on public.listing_comments
for select to anon, authenticated
using (status = 'published' or user_id = auth.uid());

drop policy if exists listing_comments_user_insert on public.listing_comments;
create policy listing_comments_user_insert on public.listing_comments
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.status in ('active', 'sold', 'archived')
      and l.moderation_status = 'approved'
  )
);

drop policy if exists listing_comments_user_update on public.listing_comments;
create policy listing_comments_user_update on public.listing_comments
for update to authenticated
using (user_id = auth.uid() and status = 'pending')
with check (user_id = auth.uid() and status = 'pending');

grant select on public.listing_comments to anon, authenticated;
grant insert, update on public.listing_comments to authenticated;
