-- Make listing entitlement independent from optional boost-credit initialization.
-- A new account always has Free access (3 listing slots) without a subscription row.
-- Paid plans are normalized and retain their exact limits.

create or replace function public.current_active_plan(p_user uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select case
    when lower(coalesce(s.status, '')) = 'active'
      and (s.current_period_end is null or s.current_period_end > now())
      and lower(coalesce(s.plan_key, 'free')) in ('basic', 'premium', 'business')
      then lower(s.plan_key)
    else 'free'
  end
  from public.seller_subscriptions s
  where s.profile_id = p_user
  limit 1;
$$;

revoke all on function public.current_active_plan(uuid) from public, anon;
grant execute on function public.current_active_plan(uuid) to authenticated;

create or replace function public.get_seller_entitlement()
returns table (
  plan_key text,
  subscription_status text,
  is_paid boolean,
  free_posts_limit integer,
  free_posts_used integer,
  free_posts_remaining integer,
  listing_limit integer,
  current_period_end timestamptz,
  boost_credits_limit integer,
  boost_credits_used integer,
  boost_credits_remaining integer,
  verification_eligible boolean
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz := null;
  v_used integer := 0;
  v_limit integer := 3;
  v_boost_granted integer := 0;
  v_boost_used integer := 0;
  v_unlimited boolean := false;
  v_paid boolean := false;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  v_unlimited := private.is_bese26_unlimited_admin(v_user);
  if v_unlimited then
    return query select 'admin', 'active', true, 2147483647, 0, 2147483647,
      2147483647, null::timestamptz, 2147483647, 0, 2147483647, true;
    return;
  end if;

  -- No subscription row is a valid Free account, not an error.
  select lower(coalesce(s.plan_key, 'free')),
         lower(coalesce(s.status, 'inactive')),
         s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s
   where s.profile_id = v_user
   limit 1;

  v_plan := case when v_plan in ('basic', 'premium', 'business') then v_plan else 'free' end;
  v_paid := v_status = 'active'
    and (v_end is null or v_end > now())
    and v_plan <> 'free';
  if not v_paid then v_plan := 'free'; end if;
  v_limit := public.listing_limit_for_plan(v_plan);

  -- Quota is authoritative and never depends on optional credit tables.
  select count(*)::integer into v_used
    from public.listings l
   where l.seller_id = v_user
     and l.status in ('pending', 'active');

  -- Boost credits are supplemental; a failure must not remove listing access.
  begin
    select coalesce(c.credits_granted, 0), coalesce(c.credits_used, 0)
      into v_boost_granted, v_boost_used
      from public.ensure_monthly_boost_credits(v_user) c
     limit 1;
  exception when others then
    v_boost_granted := 0;
    v_boost_used := 0;
  end;

  return query select v_plan,
    case when v_paid then 'active' else 'inactive' end,
    v_paid,
    v_limit,
    v_used,
    greatest(v_limit - v_used, 0),
    v_limit,
    v_end,
    v_boost_granted,
    v_boost_used,
    greatest(v_boost_granted - v_boost_used, 0),
    v_plan in ('premium', 'business') and v_paid;
end;
$$;

revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;
