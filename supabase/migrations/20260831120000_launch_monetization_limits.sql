-- Bese26 launch monetization limits.
-- Active listings, not lifetime posts, are the source of truth for publishing capacity.

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
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select s.plan_key, s.status, s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s
   where s.profile_id = v_user;

  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';
  v_limit := case v_plan
    when 'basic' then 15
    when 'premium' then 50
    when 'business' then 250
    when 'vip' then 120
    when 'vip_gold' then 250
    when 'diamond_gold' then 500
    when 'diamond_elite' then 1000
    when 'enterprise_gold' then 2000
    when 'enterprise_elite' then 5000
    else 3
  end;

  select count(*)::integer into v_active_count
    from public.listings l
   where l.seller_id = v_user
     and l.status = 'active';

  return query select
    coalesce(v_plan, 'free'),
    coalesce(v_status, 'inactive'),
    v_paid,
    3,
    v_active_count,
    greatest(v_limit - v_active_count, 0),
    v_limit,
    v_end;
end;
$$;

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
  v_limit integer := 3;
  v_active_count integer := 0;
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
  v_limit := case when v_paid then case v_plan when 'basic' then 15 when 'premium' then 50 when 'business' then 250 else 3 end else 3 end;

  select count(*)::integer into v_active_count
    from public.listings l
   where l.seller_id = v_user
     and l.status = 'active';

  if v_active_count >= v_limit then
    raise exception 'ACTIVE_LISTING_LIMIT_REACHED';
  end if;

  return query
  insert into public.listings (
    seller_id, category_id, subcategory_id, title, description, price, currency,
    pricing_type, condition, quantity, unit, country, state, city,
    delivery_options, contact_preference, attributes, status, moderation_status
  ) values (
    v_user, p_category_id, p_subcategory_id, trim(p_title), trim(p_description), p_price,
    coalesce(nullif(trim(p_currency), ''), 'NGN'), coalesce(nullif(trim(p_pricing_type), ''), 'fixed'),
    nullif(trim(p_condition), ''), p_quantity, nullif(trim(p_unit), ''), coalesce(nullif(trim(p_country), ''), 'Nigeria'),
    trim(p_state), trim(p_city), coalesce(to_jsonb(p_delivery_options), '[]'::jsonb),
    coalesce(nullif(trim(p_contact_preference), ''), 'chat'), coalesce(p_attributes, '{}'::jsonb), 'pending', 'pending'
  ) returning *;
end;
$$;

revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;
revoke all on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, text[], text, jsonb) from public, anon;
grant execute on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, text[], text, jsonb) to authenticated;

comment on table public.seller_post_usage is 'Legacy compatibility table; active listing counts now enforce posting limits.';

-- Keep all non-financial client messages truthful.
-- No wallet balance or commission is introduced by this migration.

alter table public.payment_transactions drop constraint if exists payment_transactions_plan_key_check;
alter table public.payment_transactions add constraint payment_transactions_plan_key_check check (plan_key in ('basic', 'premium', 'business', 'boost'));
