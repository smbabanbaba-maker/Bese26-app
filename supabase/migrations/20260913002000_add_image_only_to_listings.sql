-- Bese26: support image-only listing rules in production.
-- Existing listings remain valid and keep the previous behavior.
alter table public.listings
  add column if not exists image_only boolean not null default false;

comment on column public.listings.image_only is
  'When true, the listing must use image media only; false preserves the existing listing behavior.';
