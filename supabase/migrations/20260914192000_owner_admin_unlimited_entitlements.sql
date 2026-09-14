-- Owner admin privileges for Bese26.
-- The owner is identified by private.is_bese26_owner_admin(), not by a frontend flag.
-- This keeps unlimited access server-side and prevents ordinary users from receiving it.

update public.profiles
set is_verified = true,
    updated_at = timezone('utc', now())
where id = (
  select id from auth.users
  where lower(email) = 'smbabanbaba@gmail.com'
  limit 1
);

create or replace function public.enforce_bese26_owner_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from auth.users
    where id = new.id and lower(email) = 'smbabanbaba@gmail.com'
  ) then
    new.is_verified := true;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_owner_verified on public.profiles;
create trigger profiles_owner_verified
before insert or update on public.profiles
for each row execute function public.enforce_bese26_owner_verified();

create or replace function public.get_seller_entitlement()
returns table (
  plan_key text, subscription_status text, is_paid boolean, free_posts_limit integer,
  free_posts_used integer, free_posts_remaining integer, listing_limit integer,
  current_period_end timestamptz, boost_credits_limit integer, boost_credits_used integer,
  boost_credits_remaining integer, verification_eligible boolean
)
language plpgsql security definer set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_used integer := 0;
  v_boost record;
  v_owner boolean := false;
  v_unlimited integer := 2147483647;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_owner := private.is_bese26_owner_admin();
  if v_owner then
    return query select 'owner_admin', 'active', true, v_unlimited, 0, v_unlimited, v_unlimited,
      null::timestamptz, v_unlimited, 0, v_unlimited, true;
    return;
  end if;
  select s.plan_key, s.status, s.current_period_end into v_plan, v_status, v_end
  from public.seller_subscriptions s where s.profile_id = v_user;
  select u.free_posts_used into v_used from public.seller_post_usage u where u.profile_id = v_user;
  select * into v_boost from public.ensure_monthly_boost_credits(v_user);
  return query select v_plan, v_status,
    v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free',
    3, coalesce(v_used, 0), greatest(3 - coalesce(v_used, 0), 0),
    case v_plan when 'basic' then 15 when 'premium' then 35 when 'business' then 60 else 3 end,
    v_end, coalesce(v_boost.credits_granted, 0), coalesce(v_boost.credits_used, 0),
    coalesce(v_boost.credits_remaining, 0), v_plan in ('premium', 'business') and v_status = 'active' and (v_end is null or v_end > now());
end;
$$;
revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;

create or replace function public.ensure_monthly_boost_credits(p_user uuid default auth.uid())
returns table (period_start date, plan_key text, credits_granted integer, credits_used integer, credits_remaining integer)
language plpgsql security definer set search_path = public, private
as $$
declare
  v_owner boolean := private.is_bese26_owner_admin();
  v_plan text := case when v_owner then 'owner_admin' else public.current_paid_plan(p_user) end;
  v_period date := date_trunc('month', timezone('utc', now()))::date;
  v_grant integer := case when v_owner then 2147483647 when v_plan = 'premium' then 5 when v_plan = 'business' then 10 else 0 end;
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

create or replace function public.redeem_free_boost_credit(p_listing_id uuid)
returns public.listing_boosts
language plpgsql security definer set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_owner boolean := false;
  v_plan text;
  v_period date := date_trunc('month', timezone('utc', now()))::date;
  v_credits public.seller_monthly_boost_credits;
  v_listing public.listings;
  v_package public.boost_packages;
  v_boost public.listing_boosts;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_owner := private.is_bese26_owner_admin();
  v_plan := public.current_paid_plan(v_user);
  if not v_owner and v_plan is null then raise exception 'PAID_PLAN_REQUIRED_FOR_FREE_BOOST'; end if;
  select * into v_listing from public.listings where id = p_listing_id and seller_id = v_user and status = 'active' for update;
  if v_listing.id is null then raise exception 'ACTIVE_LISTING_REQUIRED'; end if;
  perform public.ensure_monthly_boost_credits(v_user);
  select * into v_credits from public.seller_monthly_boost_credits where profile_id = v_user and period_start = v_period for update;
  if not v_owner and v_credits.credits_used >= v_credits.credits_granted then raise exception 'NO_FREE_BOOST_CREDITS'; end if;
  select * into v_package from public.boost_packages where name = 'Included 3-day boost' and is_active and not is_public limit 1;
  if v_package.id is null then raise exception 'FREE_BOOST_PACKAGE_MISSING'; end if;
  insert into public.listing_boosts(listing_id, seller_id, package_id, status, starts_at, ends_at)
  values (p_listing_id, v_user, v_package.id, 'active', now(), now() + interval '3 days') returning * into v_boost;
  if not v_owner then
    update public.seller_monthly_boost_credits set credits_used = credits_used + 1, updated_at = now()
    where profile_id = v_user and period_start = v_period;
  end if;
  return v_boost;
end;
$$;
revoke all on function public.redeem_free_boost_credit(uuid) from public, anon;
grant execute on function public.redeem_free_boost_credit(uuid) to authenticated;

create or replace function public.enforce_paid_listing_limit()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare
  v_plan text;
  v_limit integer;
  v_count integer;
begin
  if new.status <> 'active' or private.is_bese26_owner_admin() then return new; end if;
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

create or replace function public.enforce_paid_verification_gate()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.user_id = auth.uid() and not private.is_bese26_owner_admin() and not public.current_user_can_moderate() and public.current_paid_plan(new.user_id) is null then
    raise exception 'PAID_PLAN_REQUIRED_FOR_VERIFICATION';
  end if;
  return new;
end;
$$;
