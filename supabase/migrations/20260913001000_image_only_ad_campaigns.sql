-- Image-first campaign banners. When enabled, the uploaded artwork is rendered as the full campaign creative.
alter table public.ad_campaigns
  add column if not exists image_only boolean not null default false;

-- Existing advertiser artwork should use the image-first renderer too.
update public.ad_campaigns
set image_only = true
where image_url is not null;

comment on column public.ad_campaigns.image_only is 'Render the uploaded campaign artwork as the complete creative without generated text overlays.';

notify pgrst, 'reload schema';
