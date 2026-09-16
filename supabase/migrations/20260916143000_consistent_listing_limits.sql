-- Bese26 listing quota policy (single source of truth):
-- Free = 3 active listings; Basic = 15; Premium = 35; Business = 60.
-- The owner admin and admin approval actions are unlimited.

create or replace function public.listing_limit_for_plan(p_plan text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case lower(coalesce(p_plan, 'free'))
    when 'basic' then 15
    when 'premium' then 35
    when 'business' then 60
    else 3
  end;
$$;

revoke all on function public.listing_limit_for_plan(text) from public, anon;
grant execute on function public.listing_limit_for_plan(text) to authenticated;

create or replace function public.get_seller_entitlement()
returns table (
  plan_key text,
  subscription_status text,
  is_paid boolean,
  free_posts_limit integer,
  free_posts_used integer,
  free_posts_remaining integer,
  listing_limit integer,
  current_period_end timestamptz
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
  v_paid boolean := false;
  v_limit integer := 3;
  v_owner_admin boolean := false;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  v_owner_admin := private.is_bese26_owner_admin();
  select s.plan_key, s.status, s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s
   where s.profile_id = v_user;

  v_paid := v_owner_admin or (v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free');
  v_limit := case when v_owner_admin then 2147483647 else public.listing_limit_for_plan(v_plan) end;

  select count(*)::integer into v_active_count
    from public.listings l
   where l.seller_id = v_user
     and l.status = 'active';

  return query select
    case when v_owner_admin then 'admin' else coalesce(v_plan, 'free') end,
    coalesce(v_status, 'inactive'),
    v_paid,
    3,
    v_active_count,
    case when v_owner_admin then 2147483647 else greatest(v_limit - v_active_count, 0) end,
    v_limit,
    v_end;
end;
$$;

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
  if new.status <> 'active' then return new; end if;

  -- Admin approval and owner-admin listings are never blocked by seller quotas.
  if private.is_bese26_owner_admin() then return new; end if;
  if exists (
    select 1 from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = new.seller_id
      and lower(coalesce(u.email, '')) = 'smbabanbaba@gmail.com'
      and p.app_role = 'admin'
      and coalesce(p.admin_suspended, false) = false
  ) then return new; end if;

  v_plan := public.current_active_plan(new.seller_id);
  v_limit := public.listing_limit_for_plan(v_plan);

  select count(*) into v_count
    from public.listings l
   where l.seller_id = new.seller_id
     and l.status = 'active'
     and l.id <> new.id;

  if v_count >= v_limit then
    raise exception 'ACTIVE_LISTING_LIMIT_REACHED';
  end if;
  return new;
end;
$$;

revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;
revoke all on function public.enforce_paid_listing_limit() from public, anon;
grant execute on function public.enforce_paid_listing_limit() to authenticated;

comment on function public.listing_limit_for_plan(text) is
  'Bese26 quota policy: free 3, basic 15, premium 35, business 60.';
