-- Remaining admin operations: marketplace settings and operational workflows.
create or replace function public.admin_marketplace_operations()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order, c.name) from (select id,parent_id,name,slug,icon,sort_order,is_active from public.categories order by sort_order,name limit 200) c), '[]'::jsonb),
    'boost_packages', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from (select id,name,duration_days,price_kobo,placement,is_active,created_at from public.boost_packages order by created_at desc) b), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (select r.id,r.listing_id,r.reviewer_id,r.rating,r.body,r.status,r.created_at,l.title,p.display_name as reviewer_name from public.reviews r left join public.listings l on l.id=r.listing_id left join public.profiles p on p.id=r.reviewer_id where r.status='pending' order by r.created_at desc limit 50) r), '[]'::jsonb),
    'callbacks', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from (select c.id,c.listing_id,c.requester_id,c.seller_id,c.message,c.status,c.created_at,l.title,p.display_name as requester_name from public.listing_callback_requests c left join public.listings l on l.id=c.listing_id left join public.profiles p on p.id=c.requester_id where c.status in ('pending','contacted') order by c.created_at desc limit 50) c), '[]'::jsonb),
    'active_boosts', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from (select b.id,b.listing_id,b.seller_id,b.package_id,b.status,b.starts_at,b.ends_at,l.title,p.display_name as seller_name from public.listing_boosts b left join public.listings l on l.id=b.listing_id left join public.profiles p on p.id=b.seller_id where b.status in ('pending','active') order by b.created_at desc limit 50) b), '[]'::jsonb),
    'payment_summary', jsonb_build_object('transactions', (select count(*) from public.payment_transactions), 'successful', (select count(*) from public.payment_transactions where status='success'), 'pending', (select count(*) from public.payment_transactions where status='pending')),
    'analytics', jsonb_build_object('views_7d', (select count(*) from public.listing_views where viewed_at >= timezone('utc',now()) - interval '7 days'), 'offers', (select count(*) from public.chat_offers), 'meetings', (select count(*) from public.chat_meetings), 'conversations', (select count(*) from public.conversations))
  ) into v_result;
  return v_result;
end; $$;
revoke all on function public.admin_marketplace_operations() from public, anon;
grant execute on function public.admin_marketplace_operations() to authenticated;

create or replace function public.admin_update_review(p_review_id uuid, p_status text)
returns public.reviews language plpgsql security definer set search_path=public as $$
declare v_row public.reviews;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('pending','published','rejected') then raise exception 'Invalid review status'; end if;
  update public.reviews set status=p_status where id=p_review_id returning * into v_row;
  if v_row.id is null then raise exception 'Review not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_update_review(uuid,text) from public, anon;
grant execute on function public.admin_update_review(uuid,text) to authenticated;

create or replace function public.admin_update_callback(p_callback_id uuid, p_status text)
returns public.listing_callback_requests language plpgsql security definer set search_path=public as $$
declare v_row public.listing_callback_requests;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('pending','contacted','completed','cancelled') then raise exception 'Invalid callback status'; end if;
  update public.listing_callback_requests set status=p_status, updated_at=timezone('utc',now()) where id=p_callback_id returning * into v_row;
  if v_row.id is null then raise exception 'Callback request not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_update_callback(uuid,text) from public, anon;
grant execute on function public.admin_update_callback(uuid,text) to authenticated;

create or replace function public.admin_update_boost(p_boost_id uuid, p_status text)
returns public.listing_boosts language plpgsql security definer set search_path=public as $$
declare v_row public.listing_boosts;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('pending','active','expired','cancelled','failed') then raise exception 'Invalid boost status'; end if;
  update public.listing_boosts set status=p_status, updated_at=timezone('utc',now()) where id=p_boost_id returning * into v_row;
  if v_row.id is null then raise exception 'Boost not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_update_boost(uuid,text) from public, anon;
grant execute on function public.admin_update_boost(uuid,text) to authenticated;

create or replace function public.admin_set_category_active(p_category_id uuid, p_is_active boolean)
returns public.categories language plpgsql security definer set search_path=public as $$
declare v_row public.categories;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  update public.categories set is_active=p_is_active, updated_at=timezone('utc',now()) where id=p_category_id returning * into v_row;
  if v_row.id is null then raise exception 'Category not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_set_category_active(uuid,boolean) from public, anon;
grant execute on function public.admin_set_category_active(uuid,boolean) to authenticated;

create or replace function public.admin_upsert_boost_package(p_id uuid, p_name text, p_duration_days integer, p_price_kobo integer, p_placement text, p_is_active boolean)
returns public.boost_packages language plpgsql security definer set search_path=public as $$
declare v_row public.boost_packages;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  if p_name is null or char_length(trim(p_name)) < 3 or p_duration_days <= 0 or p_price_kobo <= 0 or p_placement not in ('featured','top_search','homepage') then raise exception 'Invalid boost package'; end if;
  if p_id is null then insert into public.boost_packages(name,duration_days,price_kobo,placement,is_active) values(trim(p_name),p_duration_days,p_price_kobo,p_placement,p_is_active) returning * into v_row;
  else update public.boost_packages set name=trim(p_name),duration_days=p_duration_days,price_kobo=p_price_kobo,placement=p_placement,is_active=p_is_active where id=p_id returning * into v_row; end if;
  if v_row.id is null then raise exception 'Boost package not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_upsert_boost_package(uuid,text,integer,integer,text,boolean) from public, anon;
grant execute on function public.admin_upsert_boost_package(uuid,text,integer,integer,text,boolean) to authenticated;
