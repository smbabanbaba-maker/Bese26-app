-- Admin listings must not fail when moderation changes a pending listing to active.
-- Owner and active admin profiles are unlimited; ordinary users keep their plan limits.

create or replace function private.is_bese26_unlimited_admin(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = p_user
      and coalesce(p.admin_suspended, false) = false
      and (
        lower(coalesce(u.email, '')) = 'smbabanbaba@gmail.com'
        or coalesce(p.app_role, '') = 'admin'
        or exists (
          select 1 from public.admin_team_members tm
          where tm.user_id = u.id
            and tm.active = true
            and 'listings' = any(tm.permissions)
        )
      )
  );
$$;
revoke all on function private.is_bese26_unlimited_admin(uuid) from public, anon;
grant execute on function private.is_bese26_unlimited_admin(uuid) to authenticated;

-- Approval and any direct listing activation now skip plan limits for admins based on seller_id.
create or replace function public.enforce_paid_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_plan text;
  v_limit integer;
  v_count integer;
begin
  if new.status <> 'active' or private.is_bese26_unlimited_admin(new.seller_id) then
    return new;
  end if;
  v_plan := public.current_active_plan(coalesce(new.seller_id, auth.uid()));
  v_limit := case v_plan when 'premium' then 35 when 'business' then 60 when 'basic' then 15 else 3 end;
  select count(*) into v_count
  from public.listings l
  where l.seller_id = new.seller_id and l.status = 'active' and l.id <> new.id;
  if v_count >= v_limit then raise exception 'ACTIVE_LISTING_LIMIT_REACHED'; end if;
  return new;
end;
$$;

drop trigger if exists listings_paid_limit_guard on public.listings;
create trigger listings_paid_limit_guard
before insert or update of status on public.listings
for each row execute function public.enforce_paid_listing_limit();

-- Keep the owner/admin status visible to the frontend entitlement panel.
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
  v_unlimited boolean := false;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_unlimited := private.is_bese26_unlimited_admin(v_user);
  if v_unlimited then
    return query select 'admin', 'active', true, 2147483647, 0, 2147483647, 2147483647,
      null::timestamptz, 2147483647, 0, 2147483647, true;
    return;
  end if;
  select s.plan_key, s.status, s.current_period_end
  into v_plan, v_status, v_end
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
