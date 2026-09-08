alter table public.business_profiles
  add column if not exists contact_preference text not null default 'both';

alter table public.business_profiles
  drop constraint if exists business_profiles_contact_preference_check;

alter table public.business_profiles
  add constraint business_profiles_contact_preference_check
  check (contact_preference in ('whatsapp', 'call', 'both'));

comment on column public.business_profiles.contact_preference is 'Public contact actions shown on business storefronts and listing cards.';
