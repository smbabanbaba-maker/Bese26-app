-- Bese26: revise a rejected listing and send the same listing back for moderation.
-- This does not create a new listing and cannot approve or publish it.

create or replace function public.revise_rejected_listing(
  p_listing_id uuid,
  p_category_id uuid,
  p_subcategory_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_city text,
  p_state text,
  p_currency text default 'NGN',
  p_pricing_type text default 'fixed',
  p_condition text default null,
  p_quantity numeric default null,
  p_unit text default null,
  p_country text default 'Nigeria',
  p_delivery_options jsonb default '[]'::jsonb,
  p_contact_preference text default 'chat',
  p_attributes jsonb default '{}'::jsonb
)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_listing public.listings;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if nullif(trim(coalesce(p_title, '')), '') is null
    or nullif(trim(coalesce(p_description, '')), '') is null
    or p_price is null
    or p_price <= 0
    or nullif(trim(coalesce(p_city, '')), '') is null
    or nullif(trim(coalesce(p_state, '')), '') is null then
    raise exception using errcode = '22023', message = 'Title, description, price, state, and city are required';
  end if;

  if not exists (select 1 from public.categories where id = p_category_id and is_active = true) then
    raise exception using errcode = '22023', message = 'Category is not available';
  end if;

  update public.listings
  set category_id = p_category_id,
      subcategory_id = p_subcategory_id,
      title = trim(p_title),
      description = trim(p_description),
      price = p_price,
      currency = coalesce(nullif(trim(p_currency), ''), 'NGN'),
      pricing_type = coalesce(nullif(trim(p_pricing_type), ''), 'fixed'),
      condition = nullif(trim(coalesce(p_condition, '')), ''),
      quantity = p_quantity,
      unit = nullif(trim(coalesce(p_unit, '')), ''),
      city = trim(p_city),
      state = trim(p_state),
      country = coalesce(nullif(trim(p_country), ''), 'Nigeria'),
      delivery_options = case when jsonb_typeof(coalesce(p_delivery_options, '[]'::jsonb)) = 'array' then p_delivery_options else '[]'::jsonb end,
      contact_preference = coalesce(nullif(trim(p_contact_preference), ''), 'chat'),
      attributes = case when jsonb_typeof(coalesce(p_attributes, '{}'::jsonb)) = 'object' then p_attributes else '{}'::jsonb end,
      status = 'pending',
      moderation_status = 'pending',
      rejection_reason = null,
      published_at = null,
      updated_at = timezone('utc', now())
  where id = p_listing_id
    and seller_id = auth.uid()
    and status = 'rejected'
    and moderation_status = 'rejected'
  returning * into updated_listing;

  if updated_listing.id is null then
    raise exception using errcode = '42501', message = 'Only your rejected listings can be revised';
  end if;

  return updated_listing;
end;
$$;

revoke all on function public.revise_rejected_listing(uuid, uuid, uuid, text, text, numeric, text, text, text, text, text, numeric, text, text, jsonb, text, jsonb) from public, anon;
grant execute on function public.revise_rejected_listing(uuid, uuid, uuid, text, text, numeric, text, text, text, text, text, numeric, text, text, jsonb, text, jsonb) to authenticated;
