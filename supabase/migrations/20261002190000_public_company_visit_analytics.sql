

create or replace function public.get_public_profile_view_history(p_profile_id uuid, p_days integer default 14)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', day_bucket::date,
    'visits', coalesce(stats.visits, 0),
    'unique_visitors', coalesce(stats.unique_visitors, 0)
  ) order by day_bucket::date), '[]'::jsonb)
  from generate_series(
    timezone('utc', now())::date - (greatest(2, least(coalesce(p_days, 14), 60)) - 1),
    timezone('utc', now())::date,
    interval '1 day'
  ) as days(day_bucket)
  left join lateral (
    select count(*)::bigint as visits, count(distinct visitor_key)::bigint as unique_visitors
      from public.public_profile_views v
     where v.profile_id = p_profile_id
       and v.visited_on = day_bucket::date
  ) stats on true;
$$;

revoke all on function public.get_public_profile_view_history(uuid, integer) from public;
grant execute on function public.get_public_profile_view_history(uuid, integer) to anon, authenticated;

comment on function public.get_public_profile_view_history(uuid, integer) is 'Returns daily aggregate public profile visits without visitor identity or IP data.';
