-- Admin-controlled advertising campaigns for Bese26 placements.
create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 5 and 240),
  image_url text,
  cta_label text not null default 'Learn more' check (char_length(cta_label) between 2 and 40),
  cta_target text not null default '/',
  placement text not null default 'home_banner' check (placement in ('home_banner', 'homepage', 'search', 'business_directory')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  priority integer not null default 0 check (priority between 0 and 1000),
  max_impressions integer check (max_impressions is null or max_impressions > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_campaigns_dates_check check (ends_at is null or ends_at > starts_at)
);

create index if not exists ad_campaigns_public_idx on public.ad_campaigns (placement, status, priority desc, starts_at, ends_at);

alter table public.ad_campaigns enable row level security;
drop policy if exists ad_campaigns_public_active_read on public.ad_campaigns;
create policy ad_campaigns_public_active_read on public.ad_campaigns
  for select to anon, authenticated
  using (status = 'active' and starts_at <= now() and (ends_at is null or ends_at > now()));
drop policy if exists ad_campaigns_admin_read on public.ad_campaigns;
create policy ad_campaigns_admin_read on public.ad_campaigns
  for select to authenticated using (private.is_admin());
drop policy if exists ad_campaigns_admin_insert on public.ad_campaigns;
create policy ad_campaigns_admin_insert on public.ad_campaigns
  for insert to authenticated with check (private.is_admin() and created_by = auth.uid());
drop policy if exists ad_campaigns_admin_update on public.ad_campaigns;
create policy ad_campaigns_admin_update on public.ad_campaigns
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists ad_campaigns_admin_delete on public.ad_campaigns;
create policy ad_campaigns_admin_delete on public.ad_campaigns
  for delete to authenticated using (private.is_admin());

drop trigger if exists ad_campaigns_updated_at on public.ad_campaigns;
create trigger ad_campaigns_updated_at before update on public.ad_campaigns for each row execute procedure private.set_updated_at();

grant select on public.ad_campaigns to anon, authenticated;
grant insert, update, delete on public.ad_campaigns to authenticated;
comment on table public.ad_campaigns is 'Admin-controlled campaigns for clearly labelled Bese26 ad placements.';
