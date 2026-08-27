-- Bese26 subscription entitlements and three-free-post allowance
-- Payment checkout is intentionally not included here. Subscription rows are written only by a future trusted payment workflow.

create table if not exists public.seller_subscriptions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  plan_key text not null default 'free' check (plan_key in ('free','basic','premium','business','vip','vip_gold','diamond_gold','diamond_elite','enterprise_gold','enterprise_elite')),
  status text not null default 'inactive' check (status in ('inactive','pending','active','paused','canceled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_post_usage (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  free_posts_used integer not null default 0 check (free_posts_used >= 0 and free_posts_used <= 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_subscriptions_status_idx on public.seller_subscriptions (status, current_period_end);

alter table public.seller_subscriptions enable row level security;
alter table public.seller_post_usage enable row level security;

drop policy if exists seller_subscriptions_owner_read on public.seller_subscriptions;
create policy seller_subscriptions_owner_read on public.seller_subscriptions
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists seller_post_usage_owner_read on public.seller_post_usage;
create policy seller_post_usage_owner_read on public.seller_post_usage
  for select to authenticated using (profile_id = auth.uid());

grant select on public.seller_subscriptions, public.seller_post_usage to authenticated;
revoke insert, update, delete on public.seller_subscriptions, public.seller_post_usage from anon, authenticated;
revoke insert on public.listings from anon, authenticated;

drop trigger if exists seller_subscriptions_updated_at on public.seller_subscriptions;
create trigger seller_subscriptions_updated_at before update on public.seller_subscriptions for each row execute procedure private.set_updated_at();

drop trigger if exists seller_post_usage_updated_at on public.seller_post_usage;
create trigger seller_post_usage_updated_at before update on public.seller_post_usage for each row execute procedure private.set_updated_at();

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
  v_used integer := 0;
  v_paid boolean := false;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select s.plan_key, s.status, s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s
   where s.profile_id = v_user;

  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';

  select u.free_posts_used into v_used
    from public.seller_post_usage u
   where u.profile_id = v_user;

  return query select
    v_plan,
    v_status,
    v_paid,
    3,
    coalesce(v_used, 0),
    greatest(3 - coalesce(v_used, 0), 0),
    case v_plan
      when 'basic' then 20
      when 'premium' then 60
      when 'business' then 250
      when 'vip' then 120
      when 'vip_gold' then 250
      when 'diamond_gold' then 500
      when 'diamond_elite' then 1000
      when 'enterprise_gold' then 2000
      when 'enterprise_elite' then 5000
      else 3
    end,
    v_end;
end;
$$;

revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;

create or replace function public.create_listing_with_plan(
  p_category_id uuid,
  p_subcategory_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_currency text,
  p_pricing_type text,
  p_condition text,
  p_quantity integer,
  p_unit text,
  p_country text,
  p_state text,
  p_city text,
  p_delivery_options text[],
  p_contact_preference text,
  p_attributes jsonb
)
returns setof public.listings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_paid boolean := false;
  v_used integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'TITLE_REQUIRED'; end if;
  if nullif(trim(p_description), '') is null then raise exception 'DESCRIPTION_REQUIRED'; end if;
  if p_price is null or p_price <= 0 then raise exception 'VALID_PRICE_REQUIRED'; end if;
  if nullif(trim(p_state), '') is null or nullif(trim(p_city), '') is null then raise exception 'LOCATION_REQUIRED'; end if;
  if not exists (select 1 from public.categories c where c.id = p_category_id and c.is_active) then raise exception 'CATEGORY_NOT_AVAILABLE'; end if;
  if p_subcategory_id is not null and not exists (select 1 from public.categories c where c.id = p_subcategory_id and c.parent_id = p_category_id and c.is_active) then raise exception 'SUBCATEGORY_NOT_AVAILABLE'; end if;

  select s.plan_key, s.status, s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s
   where s.profile_id = v_user
   for update;
  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';

  if not v_paid then
    insert into public.seller_post_usage (profile_id, free_posts_used)
    values (v_user, 1)
    on conflict (profile_id) do update
      set free_posts_used = public.seller_post_usage.free_posts_used + 1,
          updated_at = now()
      where public.seller_post_usage.free_posts_used < 3
    returning free_posts_used into v_used;
    if v_used is null then
      raise exception 'FREE_POST_LIMIT_REACHED';
    end if;
  end if;

  return query
  insert into public.listings (
    seller_id, category_id, subcategory_id, title, description, price, currency,
    pricing_type, condition, quantity, unit, country, state, city,
    delivery_options, contact_preference, attributes, status, moderation_status
  ) values (
    v_user, p_category_id, p_subcategory_id, trim(p_title), trim(p_description), p_price, coalesce(nullif(trim(p_currency), ''), 'NGN'),
    coalesce(nullif(trim(p_pricing_type), ''), 'fixed'), nullif(trim(p_condition), ''), p_quantity, nullif(trim(p_unit), ''),
    coalesce(nullif(trim(p_country), ''), 'Nigeria'), trim(p_state), trim(p_city), coalesce(p_delivery_options, '{}'::text[]),
    coalesce(nullif(trim(p_contact_preference), ''), 'chat'), coalesce(p_attributes, '{}'::jsonb), 'pending', 'pending'
  ) returning *;
end;
$$;

revoke all on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, text[], text, jsonb) from public, anon;
grant execute on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, text[], text, jsonb) to authenticated;
