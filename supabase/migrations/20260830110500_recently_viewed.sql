create table if not exists public.recently_viewed (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  viewed_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, listing_id)
);
create index if not exists recently_viewed_user_idx on public.recently_viewed (user_id, viewed_at desc);
alter table public.recently_viewed enable row level security;
drop policy if exists recently_viewed_self on public.recently_viewed;
create policy recently_viewed_self on public.recently_viewed for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.recently_viewed to authenticated;
