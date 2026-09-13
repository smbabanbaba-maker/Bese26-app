-- Image-first campaign banners. When enabled, the uploaded artwork is rendered as the full campaign creative.
alter table public.ad_campaigns
  add column if not exists image_only boolean not null default false;

comment on column public.ad_campaigns.image_only is 'Render the uploaded campaign artwork as the complete creative without generated text overlays.';
