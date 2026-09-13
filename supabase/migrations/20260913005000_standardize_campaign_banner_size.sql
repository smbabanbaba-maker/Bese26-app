-- One universal advertiser creative for every campaign placement.
update public.ad_campaigns
set creative_width = 1600,
    creative_height = 500;

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_creative_width_check,
  drop constraint if exists ad_campaigns_creative_height_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_creative_width_check check (creative_width = 1600),
  add constraint ad_campaigns_creative_height_check check (creative_height = 500);

notify pgrst, 'reload schema';
