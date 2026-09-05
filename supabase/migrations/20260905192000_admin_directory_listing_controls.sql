create or replace function public.admin_directory_controls()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
    'businesses', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from (select bp.profile_id,bp.business_name,bp.business_handle,bp.is_active,bp.is_verified,bp.city,bp.state,bp.created_at,p.display_name as owner_name from public.business_profiles bp left join public.profiles p on p.id=bp.profile_id order by bp.created_at desc limit 50) b), '[]'::jsonb),
    'listings', coalesce((select jsonb_agg(to_jsonb(l) order by l.updated_at desc) from (select l.id,l.title,l.status,l.moderation_status,l.price,l.currency,l.city,l.state,l.updated_at,p.display_name as seller_name from public.listings l left join public.profiles p on p.id=l.seller_id order by l.updated_at desc limit 50) l), '[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;
revoke all on function public.admin_directory_controls() from public, anon;
grant execute on function public.admin_directory_controls() to authenticated;

create or replace function public.admin_set_listing_lifecycle(p_listing_id uuid, p_status text)
returns public.listings language plpgsql security definer set search_path=public as $$
declare v_row public.listings;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('draft','pending','active','paused','sold','archived','rejected') then raise exception 'Invalid listing status'; end if;
  update public.listings set status=p_status, updated_at=timezone('utc',now()) where id=p_listing_id returning * into v_row;
  if v_row.id is null then raise exception 'Listing not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_set_listing_lifecycle(uuid,text) from public, anon;
grant execute on function public.admin_set_listing_lifecycle(uuid,text) to authenticated;
