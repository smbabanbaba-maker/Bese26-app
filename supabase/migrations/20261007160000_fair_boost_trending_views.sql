-- Fair Boost, Trending deals, and transparent listing views.
-- Views are authenticated, owner-excluded, and deduplicated per viewer/listing
-- for six hours so refreshes cannot inflate a seller's numbers.

alter table public.listing_views
  add column if not exists view_source text not null default 'organic';

alter table public.listing_views
  drop constraint if exists listing_views_view_source_check;
alter table public.listing_views
  add constraint listing_views_view_source_check
  check (view_source in ('organic', 'boost', 'search', 'category', 'home'));

create index if not exists listing_views_listing_source_time_idx
  on public.listing_views (listing_id, view_source, viewed_at desc);

-- Keep the historical one-argument RPC contract while allowing the client to
-- report the placement that led to the detail view.
drop function if exists public.record_listing_view(uuid);
drop function if exists public.record_listing_view(uuid, text);
create or replace function public.record_listing_view(
  p_listing_id uuid,
  p_view_source text default 'organic'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
  v_viewer uuid := auth.uid();
  v_source text := case when p_view_source in ('organic','boost','search','category','home') then p_view_source else 'organic' end;
  v_seller uuid;
begin
  if v_viewer is null then return 0; end if;

  select seller_id into v_seller from public.listings where id = p_listing_id;
  if v_seller is null or v_seller = v_viewer then
    return coalesce((select views_count from public.listings where id = p_listing_id), 0);
  end if;

  if not exists (
    select 1 from public.listings
     where id = p_listing_id and status = 'active' and moderation_status = 'approved'
  ) then
    return 0;
  end if;

  if exists (
    select 1 from public.listing_views
     where listing_id = p_listing_id
       and viewer_id = v_viewer
       and viewed_at >= timezone('utc', now()) - interval '6 hours'
  ) then
    return coalesce((select views_count from public.listings where id = p_listing_id), 0);
  end if;

  insert into public.listing_views (listing_id, viewer_id, view_source)
  values (p_listing_id, v_viewer, v_source);

  update public.listings
     set views_count = coalesce(views_count, 0) + 1,
         updated_at = updated_at
   where id = p_listing_id
   returning views_count into v_count;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.record_listing_view(uuid, text) from public, anon;
grant execute on function public.record_listing_view(uuid, text) to authenticated;

-- A capped, explainable score: recent views, saves, inquiries and freshness.
-- Boost contributes a small tie-breaker only; it cannot dominate organic demand.
create or replace function public.get_trending_listing_scores(p_limit integer default 40)
returns table (
  listing_id uuid,
  views_7d bigint,
  saves_7d bigint,
  inquiries_7d bigint,
  boost_active boolean,
  trending_score numeric
)
language sql
security definer
set search_path = public
as $$
  with eligible as (
    select l.id, l.created_at,
           exists (select 1 from public.active_listing_boosts b where b.listing_id = l.id) as boost_active
      from public.listings l
     where l.status = 'active' and l.moderation_status = 'approved'
     limit 5000
  ),
  views as (
    select listing_id, count(*)::bigint as total,
           count(*) filter (where view_source = 'boost')::bigint as boost_views
      from public.listing_views
     where viewed_at >= timezone('utc', now()) - interval '7 days'
     group by listing_id
  ),
  saves as (
    select listing_id, count(*)::bigint as total
      from public.listing_favorites
     where created_at >= timezone('utc', now()) - interval '7 days'
     group by listing_id
  ),
  inquiries as (
    select listing_id, count(*)::bigint as total
      from public.conversations
     where created_at >= timezone('utc', now()) - interval '7 days'
     group by listing_id
  )
  select e.id,
         coalesce(v.total, 0), coalesce(s.total, 0), coalesce(i.total, 0), e.boost_active,
         round((coalesce(v.total, 0) * 1.0) + (coalesce(s.total, 0) * 4.0) + (coalesce(i.total, 0) * 6.0)
           + case when e.created_at >= timezone('utc', now()) - interval '48 hours' then 2 else 0 end
           + case when e.boost_active then 1 else 0 end, 2)
    from eligible e
    left join views v on v.listing_id = e.id
    left join saves s on s.listing_id = e.id
    left join inquiries i on i.listing_id = e.id
   order by 6 desc, e.created_at desc
   limit greatest(1, least(coalesce(p_limit, 40), 100));
$$;

revoke all on function public.get_trending_listing_scores(integer) from public, anon;
grant execute on function public.get_trending_listing_scores(integer) to authenticated;
