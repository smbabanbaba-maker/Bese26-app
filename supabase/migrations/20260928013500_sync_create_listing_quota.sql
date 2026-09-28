-- Keep the direct listing RPC aligned with the trigger and entitlement RPC.
-- Pending listings consume quota immediately.

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
  p_delivery_options jsonb,
  p_contact_preference text,
  p_attributes jsonb,
  p_business_profile_id uuid default null,
  p_published_as_type text default 'personal'
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
  v_limit integer := 3;
  v_listing_count integer := 0;
  v_business_id uuid := null;
  v_publish_type text := coalesce(nullif(trim(p_published_as_type), ''), 'personal');
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'TITLE_REQUIRED'; end if;
  if nullif(trim(p_description), '') is null then raise exception 'DESCRIPTION_REQUIRED'; end if;
  if p_price is null or p_price <= 0 then raise exception 'VALID_PRICE_REQUIRED'; end if;
  if nullif(trim(p_state), '') is null or nullif(trim(p_city), '') is null then raise exception 'LOCATION_REQUIRED'; end if;
  if v_publish_type not in ('personal', 'business') then raise exception 'INVALID_PUBLISH_IDENTITY'; end if;

  if v_publish_type = 'business' then
    if p_business_profile_id is null then raise exception 'BUSINESS_REQUIRED'; end if;
    select bp.profile_id into v_business_id
      from public.business_profiles bp
     where bp.profile_id = p_business_profile_id
       and bp.profile_id = v_user
       and bp.is_active = true;
    if v_business_id is null then raise exception 'BUSINESS_NOT_OWNED'; end if;
  end if;

  if not exists (select 1 from public.categories c where c.id = p_category_id and c.is_active) then
    raise exception 'CATEGORY_NOT_AVAILABLE';
  end if;
  if p_subcategory_id is not null and not exists (
    select 1 from public.categories c where c.id = p_subcategory_id and c.parent_id = p_category_id and c.is_active
  ) then raise exception 'SUBCATEGORY_NOT_AVAILABLE'; end if;

  if private.is_bese26_unlimited_admin(v_user) then
    v_limit := 2147483647;
  else
    select s.plan_key, s.status, s.current_period_end
      into v_plan, v_status, v_end
      from public.seller_subscriptions s
     where s.profile_id = v_user
     for update;
    if not (v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free') then
      v_plan := 'free';
    end if;
    v_limit := public.listing_limit_for_plan(v_plan);
  end if;

  select count(*)::integer into v_listing_count
    from public.listings l
   where l.seller_id = v_user
     and l.status in ('pending', 'active');
  if v_listing_count >= v_limit then raise exception 'ACTIVE_LISTING_LIMIT_REACHED'; end if;

  return query insert into public.listings (
    seller_id, business_profile_id, published_as_type, category_id, subcategory_id,
    title, description, price, currency, pricing_type, condition, quantity, unit,
    country, state, city, delivery_options, contact_preference, attributes,
    status, moderation_status
  ) values (
    v_user, v_business_id, v_publish_type, p_category_id, p_subcategory_id,
    trim(p_title), trim(p_description), p_price, coalesce(nullif(trim(p_currency), ''), 'NGN'),
    coalesce(nullif(trim(p_pricing_type), ''), 'fixed'), nullif(trim(p_condition), ''),
    p_quantity, nullif(trim(p_unit), ''), coalesce(nullif(trim(p_country), ''), 'Nigeria'),
    trim(p_state), trim(p_city),
    case when jsonb_typeof(coalesce(p_delivery_options, '[]'::jsonb)) = 'array' then p_delivery_options else '[]'::jsonb end,
    coalesce(nullif(trim(p_contact_preference), ''), 'chat'), coalesce(p_attributes, '{}'::jsonb),
    'pending', 'pending'
  ) returning *;
end;
$$;

revoke all on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, jsonb, text, jsonb, uuid, text) from public, anon;
grant execute on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, jsonb, text, jsonb, uuid, text) to authenticated;
