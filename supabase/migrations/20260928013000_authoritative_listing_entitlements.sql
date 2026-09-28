-- Authoritative seller entitlement output.
-- Free 3, Basic 15, Premium 35, Business 60.
-- Pending listings consume quota immediately so moderation cannot be bypassed.

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
  v_end timestamptz;
  v_active_count integer := 0;
  v_boost record;
  v_unlimited boolean := false;
  v_limit integer := 3;
  v_paid boolean := false;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  v_unlimited := private.is_bese26_unlimited_admin(v_user);
  if v_unlimited then
    return query select 'admin', 'active', true, 2147483647, 0, 2147483647,
      2147483647, null::timestamptz, 2147483647, 0, 2147483647, true;
    return;
  end if;

  select coalesce(s.plan_key, 'free'), coalesce(s.status, 'inactive'), s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s
   where s.profile_id = v_user;

  v_paid := v_status = 'active'
    and (v_end is null or v_end > now())
    and v_plan <> 'free';
  v_limit := public.listing_limit_for_plan(v_plan);

  select count(*)::integer into v_active_count
    from public.listings l
   where l.seller_id = v_user
     and l.status in ('pending', 'active');

  select * into v_boost from public.ensure_monthly_boost_credits(v_user);

  return query select v_plan, v_status, v_paid,
    v_limit,
    v_active_count,
    greatest(v_limit - v_active_count, 0),
    v_limit,
    v_end,
    coalesce(v_boost.credits_granted, 0),
    coalesce(v_boost.credits_used, 0),
    coalesce(v_boost.credits_remaining, 0),
    v_plan in ('premium', 'business') and v_paid;
end;
$$;

revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;

comment on function public.get_seller_entitlement() is
  'Authoritative Bese26 seller quota: Free 3, Basic 15, Premium 35, Business 60; pending and active listings count.';
