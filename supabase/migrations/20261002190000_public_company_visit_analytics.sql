-- Privacy-safe public storefront visitor analytics.
-- Stores a random browser key, never an IP address, name, or contact detail.
create table if not exists public.public_profile_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  visitor_key text not null check (char_length(visitor_key) between 16 and 120),
  visited_on date not null default (timezone('utc', now()))::date,
  visited_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists public_profile_views_daily_visitor_idx
  on public.public_profile_views (profile_id, visitor_key, visited_on);
create index if not exists public_profile_views_profile_time_idx
  on public.public_profile_views (profile_id, visited_at desc);

alter table public.public_profile_views enable row level security;
revoke all on table public.public_profile_views from public, anon, authenticated;

create or replace function public.record_public_profile_view(p_profile_id uuid, p_visitor_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := left(trim(coalesce(p_visitor_key, '')), 120);
  v_inserted boolean := false;
  v_total bigint;
  v_unique bigint;
  v_last timestamptz;
begin
  if p_profile_id is null or not exists (
    select 1 from public.profiles p where p.id = p_profile_id and coalesce(p.country, 'Nigeria') = 'Nigeria'
  ) then
    return jsonb_build_object('total_visits', 0, 'unique_visitors', 0, 'last_visited_at', null);
  end if;
  if char_length(v_key) < 16 then
    return jsonb_build_object('total_visits', 0, 'unique_visitors', 0, 'last_visited_at', null);
  end if;

  insert into public.public_profile_views (profile_id, visitor_key)
  values (p_profile_id, v_key)
  on conflict (profile_id, visitor_key, visited_on) do nothing;
  v_inserted := found;

  select count(*), count(distinct visitor_key), max(visited_at)
    into v_total, v_unique, v_last
    from public.public_profile_views
   where profile_id = p_profile_id;

  return jsonb_build_object(
    'recorded', v_inserted,
    'total_visits', coalesce(v_total, 0),
    'unique_visitors', coalesce(v_unique, 0),
    'last_visited_at', v_last
  );
end;
$$;

create or replace function public.get_public_profile_view_summary(p_profile_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_visits', count(*),
    'unique_visitors', count(distinct visitor_key),
    'last_visited_at', max(visited_at)
  )
  from public.public_profile_views
  where profile_id = p_profile_id;
$$;

revoke all on function public.record_public_profile_view(uuid, text) from public;
grant execute on function public.record_public_profile_view(uuid, text) to anon, authenticated;
revoke all on function public.get_public_profile_view_summary(uuid) from public;
grant execute on function public.get_public_profile_view_summary(uuid) to anon, authenticated;

comment on function public.record_public_profile_view(uuid, text) is 'Records one privacy-safe public profile visit per browser per UTC day and returns aggregate counts.';
comment on function public.get_public_profile_view_summary(uuid) is 'Returns aggregate public profile visit counts without visitor identity or IP data.';
