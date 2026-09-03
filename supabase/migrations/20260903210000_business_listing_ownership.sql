-- Persistent business publishing foundation.
-- Keeps personal ownership in seller_id while allowing a listing to be published as
-- the owner's business profile. Existing listings remain personal listings.
alter table public.listings
  add column if not exists business_profile_id uuid references public.business_profiles(profile_id) on delete set null,
  add column if not exists published_as_type text not null default 'personal';

alter table public.listings
drop constraint if exists listings_published_as_type_check;
alter table public.listings
add constraint listings_published_as_type_check
check (published_as_type in ('personal', 'business'));

create index if not exists listings_business_profile_idx
  on public.listings (business_profile_id, status, moderation_status, created_at desc);

-- Replace the existing JSONB RPC so the business reference is written atomically
-- and cannot be spoofed by a different user.
drop function if exists public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
);

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
  if not exists (select 1 from public.categories c where c.id = p_category_id and c.is_active) then raise exception 'CATEGORY_NOT_AVAILABLE'; end if;
  if p_subcategory_id is not null and not exists (select 1 from public.categories c where c.id = p_subcategory_id and c.parent_id = p_category_id and c.is_active) then raise exception 'SUBCATEGORY_NOT_AVAILABLE'; end if;
  select s.plan_key, s.status, s.current_period_end into v_plan, v_status, v_end
    from public.seller_subscriptions s where s.profile_id = v_user for update;
  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';
  if not v_paid then
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

comment on column public.listings.business_profile_id is 'Optional owner business profile used for public publishing identity.';
comment on column public.listings.published_as_type is 'Public publishing identity: personal or business.';
