-- Owner admin is a trusted Bese26 account: show the verified badge and do not consume free listing slots.
update public.profiles
set is_verified = true,
    updated_at = timezone('utc', now())
where id = (select id from auth.users where lower(email) = 'smbabanbaba@gmail.com' limit 1);

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
  v_paid boolean := false;
  v_used integer;
  v_business_id uuid := null;
  v_publish_type text := coalesce(nullif(trim(p_published_as_type), ''), 'personal');
  v_owner_admin boolean := false;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_owner_admin := private.is_bese26_owner_admin();
  if nullif(trim(p_title), '') is null then raise exception 'TITLE_REQUIRED'; end if;
  if char_length(trim(p_description)) < 5 then raise exception 'DESCRIPTION_TOO_SHORT'; end if;
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
  if not exists (select 1 from public.categories c where c.id = p_category_id and c.is_active) then raise exception 'CATEGORY_NOT_AVAILABLE'; end if;
  if p_subcategory_id is not null and not exists (select 1 from public.categories c where c.id = p_subcategory_id and c.parent_id = p_category_id and c.is_active) then raise exception 'SUBCATEGORY_NOT_AVAILABLE'; end if;
  select s.plan_key, s.status, s.current_period_end into v_plan, v_status, v_end
    from public.seller_subscriptions s where s.profile_id = v_user for update;
  v_paid := v_owner_admin or (v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free');
  if not v_owner_admin and not v_paid then
    insert into public.seller_post_usage (profile_id, free_posts_used) values (v_user, 1)
    on conflict (profile_id) do update set free_posts_used = public.seller_post_usage.free_posts_used + 1, updated_at = now()
      where public.seller_post_usage.free_posts_used < 3
    returning free_posts_used into v_used;
    if v_used is null then raise exception 'FREE_POST_LIMIT_REACHED'; end if;
  end if;
  return query insert into public.listings (
    seller_id, business_profile_id, published_as_type, category_id, subcategory_id,
    title, description, price, currency, pricing_type, condition, quantity, unit,
    country, state, city, delivery_options, contact_preference, attributes,
    status, moderation_status
  ) values (
    v_user, v_business_id, v_publish_type, p_category_id, p_subcategory_id,
    trim(p_title), trim(p_description), p_price,
    coalesce(nullif(trim(p_currency), ''), 'NGN'), coalesce(nullif(trim(p_pricing_type), ''), 'fixed'),
    nullif(trim(p_condition), ''), p_quantity, nullif(trim(p_unit), ''),
    coalesce(nullif(trim(p_country), ''), 'Nigeria'), trim(p_state), trim(p_city),
    case when jsonb_typeof(coalesce(p_delivery_options, '[]'::jsonb)) = 'array' then p_delivery_options else '[]'::jsonb end,
    coalesce(nullif(trim(p_contact_preference), ''), 'chat'), coalesce(p_attributes, '{}'::jsonb),
    'pending', 'pending'
  ) returning *;
end;
$$;

revoke all on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb, uuid, text
) from public, anon;
grant execute on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb, uuid, text
) to authenticated;
