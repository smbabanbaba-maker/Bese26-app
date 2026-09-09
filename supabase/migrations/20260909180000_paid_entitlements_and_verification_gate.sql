-- Bese26 paid entitlements: automatic monthly boosts, paid listing limits, and verification gate.
-- Credits are allocated lazily per UTC month, so no cron job is required.

create table if not exists public.seller_monthly_boost_credits (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  credits_granted integer not null check (credits_granted >= 0),
  credits_used integer not null default 0 check (credits_used >= 0 and credits_used <= credits_granted),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, period_start)
);

alter table public.seller_monthly_boost_credits enable row level security;
drop policy if exists seller_monthly_boost_credits_owner_read on public.seller_monthly_boost_credits;
create policy seller_monthly_boost_credits_owner_read on public.seller_monthly_boost_credits
  for select to authenticated using (profile_id = auth.uid());
grant select on public.seller_monthly_boost_credits to authenticated;
revoke insert, update, delete on public.seller_monthly_boost_credits from anon, authenticated;

drop trigger if exists seller_monthly_boost_credits_updated_at on public.seller_monthly_boost_credits;
create trigger seller_monthly_boost_credits_updated_at before update on public.seller_monthly_boost_credits
  for each row execute procedure private.set_updated_at();

create or replace function public.current_paid_plan(p_user uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select case
    when s.status = 'active' and (s.current_period_end is null or s.current_period_end > now())
      and s.plan_key in ('premium', 'business') then s.plan_key
    else null
  end
  from public.seller_subscriptions s
  where s.profile_id = p_user;
$$;
revoke all on function public.current_paid_plan(uuid) from public, anon;
revoke all on function public.current_paid_plan(uuid) from authenticated;

create or replace function public.current_active_plan(p_user uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select case when s.status = 'active' and (s.current_period_end is null or s.current_period_end > now()) then s.plan_key else 'free' end
  from public.seller_subscriptions s where s.profile_id = p_user;
$$;
revoke all on function public.current_active_plan(uuid) from public, anon;
revoke all on function public.current_active_plan(uuid) from authenticated;

create or replace function public.ensure_monthly_boost_credits(p_user uuid default auth.uid())
returns table (period_start date, plan_key text, credits_granted integer, credits_used integer, credits_remaining integer)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_plan text := public.current_paid_plan(p_user);
  v_period date := date_trunc('month', timezone('utc', now()))::date;
  v_grant integer := case v_plan when 'premium' then 5 when 'business' then 10 else 0 end;
  v_row public.seller_monthly_boost_credits;
begin
  if p_user is null or auth.uid() is distinct from p_user and not public.current_user_can_moderate() then
    raise exception 'OWNER_REQUIRED';
  end if;
  insert into public.seller_monthly_boost_credits(profile_id, period_start, credits_granted)
  values (p_user, v_period, v_grant)
  on conflict (profile_id, period_start) do update
    set credits_granted = greatest(public.seller_monthly_boost_credits.credits_granted, excluded.credits_granted), updated_at = now()
  returning * into v_row;
  return query select v_row.period_start, coalesce(v_plan, 'free'), v_row.credits_granted, v_row.credits_used, greatest(v_row.credits_granted - v_row.credits_used, 0);
end;
$$;
revoke all on function public.ensure_monthly_boost_credits(uuid) from public, anon;
grant execute on function public.ensure_monthly_boost_credits(uuid) to authenticated;

-- Keep entitlement output authoritative for the UI and server-side checks.
drop function if exists public.get_seller_entitlement();
create function public.get_seller_entitlement()
returns table (
  plan_key text, subscription_status text, is_paid boolean, free_posts_limit integer,
  free_posts_used integer, free_posts_remaining integer, listing_limit integer,
  current_period_end timestamptz, boost_credits_limit integer, boost_credits_used integer,
  boost_credits_remaining integer, verification_eligible boolean
)
language plpgsql security definer set search_path = public, private
as $$
declare
  v_user uuid := auth.uid(); v_plan text := 'free'; v_status text := 'inactive'; v_end timestamptz;
  v_paid boolean := false; v_used integer := 0; v_boost record;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select s.plan_key, s.status, s.current_period_end into v_plan, v_status, v_end from public.seller_subscriptions s where s.profile_id = v_user;
  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';
  select u.free_posts_used into v_used from public.seller_post_usage u where u.profile_id = v_user;
  select * into v_boost from public.ensure_monthly_boost_credits(v_user);
  return query select v_plan, v_status, v_paid, 3, coalesce(v_used, 0), greatest(3 - coalesce(v_used, 0), 0),
    case v_plan when 'basic' then 15 when 'premium' then 35 when 'business' then 60 else 3 end,
    v_end, coalesce(v_boost.credits_granted, 0), coalesce(v_boost.credits_used, 0), coalesce(v_boost.credits_remaining, 0),
    v_plan in ('premium', 'business') and v_paid;
end;
$$;
revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;

-- Enforce active listing limits for every insert/update path, including server RPCs.
create or replace function public.enforce_paid_listing_limit()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare
  v_plan text; v_limit integer; v_count integer;
begin
  if new.status <> 'active' then return new; end if;
  v_plan := public.current_active_plan(coalesce(new.seller_id, auth.uid()));
  v_limit := case v_plan when 'premium' then 35 when 'business' then 60 when 'basic' then 15 else 3 end;
  select count(*) into v_count from public.listings l where l.seller_id = new.seller_id and l.status = 'active' and l.id <> new.id;
  if v_count >= v_limit then raise exception 'ACTIVE_LISTING_LIMIT_REACHED'; end if;
  return new;
end;
$$;
drop trigger if exists listings_paid_limit_guard on public.listings;
create trigger listings_paid_limit_guard before insert or update of status on public.listings
for each row execute procedure public.enforce_paid_listing_limit();

-- Verification can only be submitted by active Premium/Business users.
create or replace function public.enforce_paid_verification_gate()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.user_id = auth.uid() and not public.current_user_can_moderate() and public.current_paid_plan(new.user_id) is null then
    raise exception 'PAID_PLAN_REQUIRED_FOR_VERIFICATION';
  end if;
  return new;
end;
$$;
drop trigger if exists verification_paid_plan_guard on public.verification_applications;
create trigger verification_paid_plan_guard before insert or update on public.verification_applications
for each row execute procedure public.enforce_paid_verification_gate();

-- Internal three-day package used by free credits; it is not shown in the public paid package list.
alter table public.boost_packages add column if not exists is_public boolean not null default true;
insert into public.boost_packages(name, duration_days, price_kobo, placement, is_active, is_public)
select 'Included 3-day boost', 3, 1, 'featured', true, false
where not exists (select 1 from public.boost_packages where name = 'Included 3-day boost');

drop policy if exists boost_packages_public_read on public.boost_packages;
create policy boost_packages_public_read on public.boost_packages for select to anon, authenticated using (is_active = true and is_public = true);

create or replace function public.redeem_free_boost_credit(p_listing_id uuid)
returns public.listing_boosts
language plpgsql security definer set search_path = public, private
as $$
declare
  v_user uuid := auth.uid(); v_plan text; v_period date := date_trunc('month', timezone('utc', now()))::date;
  v_credits public.seller_monthly_boost_credits; v_listing public.listings; v_package public.boost_packages; v_boost public.listing_boosts;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_plan := public.current_paid_plan(v_user);
  if v_plan is null then raise exception 'PAID_PLAN_REQUIRED_FOR_FREE_BOOST'; end if;
  select * into v_listing from public.listings where id = p_listing_id and seller_id = v_user and status = 'active' for update;
  if v_listing.id is null then raise exception 'ACTIVE_LISTING_REQUIRED'; end if;
  perform public.ensure_monthly_boost_credits(v_user);
  select * into v_credits from public.seller_monthly_boost_credits where profile_id = v_user and period_start = v_period for update;
  if v_credits.credits_used >= v_credits.credits_granted then raise exception 'NO_FREE_BOOST_CREDITS'; end if;
  select * into v_package from public.boost_packages where name = 'Included 3-day boost' and is_active and not is_public limit 1;
  insert into public.listing_boosts(listing_id, seller_id, package_id, status, starts_at, ends_at)
  values (p_listing_id, v_user, v_package.id, 'active', now(), now() + interval '3 days') returning * into v_boost;
  update public.seller_monthly_boost_credits set credits_used = credits_used + 1, updated_at = now() where profile_id = v_user and period_start = v_period;
  return v_boost;
end;
$$;
revoke all on function public.redeem_free_boost_credit(uuid) from public, anon;
grant execute on function public.redeem_free_boost_credit(uuid) to authenticated;
