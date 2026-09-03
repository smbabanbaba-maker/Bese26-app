-- Real listing view events for detail-page analytics.
create table if not exists public.listing_views (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  viewed_at timestamptz not null default timezone('utc', now())
);

create index if not exists listing_views_listing_time_idx
  on public.listing_views (listing_id, viewed_at desc);

alter table public.listing_views enable row level security;

drop policy if exists listing_views_owner_read on public.listing_views;
create policy listing_views_owner_read on public.listing_views
  for select to authenticated
  using (exists (
    select 1 from public.listings l
    where l.id = listing_views.listing_id and l.seller_id = auth.uid()
  ));

grant select on public.listing_views to authenticated;

create or replace function public.record_listing_view(p_listing_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
  v_viewer uuid := auth.uid();
begin
  if not exists (
    select 1 from public.listings
    where id = p_listing_id
      and status in ('active', 'pending', 'paused', 'sold')
  ) then
    return 0;
  end if;

  insert into public.listing_views (listing_id, viewer_id)
  values (p_listing_id, v_viewer);

  update public.listings
  set views_count = views_count + 1,
      updated_at = updated_at
  where id = p_listing_id
  returning views_count into v_count;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.record_listing_view(uuid) from public, anon;
grant execute on function public.record_listing_view(uuid) to anon, authenticated;
comment on function public.record_listing_view(uuid) is 'Records a public listing view and returns the persisted total.';
