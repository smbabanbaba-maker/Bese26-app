-- Owner/admin directory search: bounded results, no service-role credentials in the browser.
create or replace function public.admin_global_directory_search(p_query text default '', p_entity text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := lower(trim(coalesce(p_query, '')));
  v_result jsonb;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  if p_entity not in ('all', 'users', 'miniwebs', 'listings') then raise exception 'Invalid search entity'; end if;
  select jsonb_build_object(
    'users', case when p_entity in ('all', 'users') then coalesce((select jsonb_agg(to_jsonb(u) order by u.created_at desc) from (
      select p.id,p.username,p.display_name,p.account_type,p.app_role,p.is_verified,p.admin_suspended,p.created_at
      from public.profiles p
      where (v_query = '' or lower(coalesce(p.username,'')) like '%' || v_query || '%' or lower(coalesce(p.display_name,'')) like '%' || v_query || '%' or lower(coalesce(p.account_type,'')) like '%' || v_query || '%')
      order by p.created_at desc limit 100
    ) u), '[]'::jsonb) else '[]'::jsonb end,
    'miniwebs', case when p_entity in ('all', 'miniwebs') then coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from (
      select bp.profile_id,bp.business_name,bp.business_handle,bp.business_type,bp.is_active,bp.is_verified,bp.verification_status,bp.city,bp.state,bp.created_at,p.display_name as owner_name,p.username as owner_username
      from public.business_profiles bp left join public.profiles p on p.id = bp.profile_id
      where (v_query = '' or lower(coalesce(bp.business_name,'')) like '%' || v_query || '%' or lower(coalesce(bp.business_handle,'')) like '%' || v_query || '%' or lower(coalesce(p.display_name,'')) like '%' || v_query || '%' or lower(coalesce(p.username,'')) like '%' || v_query || '%')
      order by bp.created_at desc limit 100
    ) b), '[]'::jsonb) else '[]'::jsonb end,
    'listings', case when p_entity in ('all', 'listings') then coalesce((select jsonb_agg(to_jsonb(l) order by l.updated_at desc) from (
      select l.id,l.seller_id,l.title,l.status,l.moderation_status,l.price,l.currency,l.city,l.state,l.updated_at,p.display_name as seller_name,p.username as seller_username
      from public.listings l left join public.profiles p on p.id = l.seller_id
      where (v_query = '' or lower(coalesce(l.title,'')) like '%' || v_query || '%' or lower(coalesce(p.display_name,'')) like '%' || v_query || '%' or lower(coalesce(p.username,'')) like '%' || v_query || '%')
      order by l.updated_at desc limit 100
    ) l), '[]'::jsonb) else '[]'::jsonb end
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.admin_global_directory_search(text,text) from public, anon;
grant execute on function public.admin_global_directory_search(text,text) to authenticated;
