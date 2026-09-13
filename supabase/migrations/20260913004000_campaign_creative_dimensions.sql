-- Preserve each advertiser's intended creative ratio for proportional Home rendering.
alter table public.ad_campaigns
  add column if not exists creative_width integer not null default 1200,
  add column if not exists creative_height integer not null default 1200;

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_creative_width_check,
  drop constraint if exists ad_campaigns_creative_height_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_creative_width_check check (creative_width between 320 and 4000),
  add constraint ad_campaigns_creative_height_check check (creative_height between 320 and 4000);

notify pgrst, 'reload schema';
