-- Real Profile account workflows for Bese26.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  query text not null default '',
  category text,
  location text,
  min_price numeric(14,2) check (min_price is null or min_price >= 0),
  max_price numeric(14,2) check (max_price is null or max_price >= 0),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  alerts_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (max_price is null or min_price is null or max_price >= min_price)
);

create table if not exists public.business_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text not null,
  logo_path text,
  category text,
  description text,
  phone text,
  email text,
  country text not null default 'Nigeria',
  state text,
  city text,
  address text,
  business_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(business_hours) = 'object'),
  website text,
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  registration_number text,
  is_verified boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'user', 'message', 'business', 'scam', 'prohibited_item', 'harassment', 'fake_information')),
  target_id uuid,
  reason text not null,
  description text check (description is null or char_length(description) <= 3000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.users_are_blocked(p_left uuid, p_right uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profile_blocks
    where (blocker_id = p_left and blocked_id = p_right)
       or (blocker_id = p_right and blocked_id = p_left)
  );
$$;
revoke all on function public.users_are_blocked(uuid, uuid) from public, anon;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;

create index if not exists profile_follows_following_idx on public.profile_follows (following_id, created_at desc);
create index if not exists saved_searches_user_idx on public.saved_searches (user_id, updated_at desc);
create index if not exists profile_blocks_blocker_idx on public.profile_blocks (blocker_id, created_at desc);
create index if not exists user_reports_reporter_idx on public.user_reports (reporter_id, created_at desc);

create trigger saved_searches_updated_at before update on public.saved_searches for each row execute procedure public.set_updated_at();
create trigger business_profiles_updated_at before update on public.business_profiles for each row execute procedure public.set_updated_at();
create trigger user_reports_updated_at before update on public.user_reports for each row execute procedure public.set_updated_at();

alter table public.profile_follows enable row level security;
alter table public.saved_searches enable row level security;
alter table public.business_profiles enable row level security;
alter table public.profile_blocks enable row level security;
alter table public.user_reports enable row level security;

drop policy if exists profile_follows_public_read on public.profile_follows;
create policy profile_follows_public_read on public.profile_follows for select to authenticated using (follower_id = auth.uid() or following_id = auth.uid());
drop policy if exists profile_follows_self_insert on public.profile_follows;
create policy profile_follows_self_insert on public.profile_follows for insert to authenticated with check (follower_id = auth.uid() and follower_id <> following_id);
drop policy if exists profile_follows_self_delete on public.profile_follows;
create policy profile_follows_self_delete on public.profile_follows for delete to authenticated using (follower_id = auth.uid());

drop policy if exists saved_searches_self_read on public.saved_searches;
create policy saved_searches_self_read on public.saved_searches for select to authenticated using (user_id = auth.uid());
drop policy if exists saved_searches_self_insert on public.saved_searches;
create policy saved_searches_self_insert on public.saved_searches for insert to authenticated with check (user_id = auth.uid());
drop policy if exists saved_searches_self_update on public.saved_searches;
create policy saved_searches_self_update on public.saved_searches for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists saved_searches_self_delete on public.saved_searches;
create policy saved_searches_self_delete on public.saved_searches for delete to authenticated using (user_id = auth.uid());

drop policy if exists business_profiles_public_read on public.business_profiles;
create policy business_profiles_public_read on public.business_profiles for select to anon, authenticated using (is_verified or profile_id = auth.uid());
drop policy if exists business_profiles_self_insert on public.business_profiles;
create policy business_profiles_self_insert on public.business_profiles for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists business_profiles_self_update on public.business_profiles;
create policy business_profiles_self_update on public.business_profiles for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists business_profiles_self_delete on public.business_profiles;
create policy business_profiles_self_delete on public.business_profiles for delete to authenticated using (profile_id = auth.uid());

drop policy if exists profile_blocks_self_read on public.profile_blocks;
create policy profile_blocks_self_read on public.profile_blocks for select to authenticated using (blocker_id = auth.uid());
drop policy if exists profile_blocks_self_insert on public.profile_blocks;
create policy profile_blocks_self_insert on public.profile_blocks for insert to authenticated with check (blocker_id = auth.uid() and blocker_id <> blocked_id);
drop policy if exists profile_blocks_self_delete on public.profile_blocks;
create policy profile_blocks_self_delete on public.profile_blocks for delete to authenticated using (blocker_id = auth.uid());

drop policy if exists user_reports_self_read on public.user_reports;
create policy user_reports_self_read on public.user_reports for select to authenticated using (reporter_id = auth.uid());
drop policy if exists user_reports_self_insert on public.user_reports;
create policy user_reports_self_insert on public.user_reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists user_reports_moderator_read on public.user_reports;
create policy user_reports_moderator_read on public.user_reports for select to authenticated using (private.is_moderator_or_admin());
drop policy if exists user_reports_moderator_update on public.user_reports;
create policy user_reports_moderator_update on public.user_reports for update to authenticated using (private.is_moderator_or_admin()) with check (private.is_moderator_or_admin());

grant select, insert, delete on public.profile_follows to authenticated;
grant select, insert, update, delete on public.saved_searches to authenticated;
grant select, insert, update, delete on public.business_profiles to authenticated;
grant select, insert, delete on public.profile_blocks to authenticated;
grant select, insert on public.user_reports to authenticated;

-- A block must stop new and existing conversations between the two users.
drop policy if exists conversations_participant_read on public.conversations;
create policy conversations_participant_read on public.conversations for select to authenticated using ((buyer_id = auth.uid() or seller_id = auth.uid()) and not public.users_are_blocked(buyer_id, seller_id));
drop policy if exists conversations_participant_insert on public.conversations;
create policy conversations_participant_insert on public.conversations for insert to authenticated with check ((buyer_id = auth.uid() or seller_id = auth.uid()) and not public.users_are_blocked(buyer_id, seller_id));
