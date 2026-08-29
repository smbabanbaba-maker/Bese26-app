-- Production business profile fields. Existing rows remain valid.
alter table public.business_profiles
  add column if not exists business_handle text,
  add column if not exists business_type text,
  add column if not exists whatsapp text,
  add column if not exists area text,
  add column if not exists delivery_available boolean not null default false,
  add column if not exists pickup_available boolean not null default true,
  add column if not exists years_in_business integer,
  add column if not exists is_active boolean not null default true,
  add column if not exists public_contact boolean not null default false,
  add column if not exists location_visibility text not null default 'city';

alter table public.business_profiles
  drop constraint if exists business_profiles_handle_format;
alter table public.business_profiles
  add constraint business_profiles_handle_format check (
    business_handle is null or business_handle ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$'
  );
alter table public.business_profiles
  drop constraint if exists business_profiles_years_check;
alter table public.business_profiles
  add constraint business_profiles_years_check check (years_in_business is null or years_in_business between 0 and 200);
alter table public.business_profiles
  drop constraint if exists business_profiles_location_visibility_check;
alter table public.business_profiles
  add constraint business_profiles_location_visibility_check check (location_visibility in ('city', 'approximate', 'exact'));
create unique index if not exists business_profiles_handle_unique
  on public.business_profiles (lower(business_handle))
  where business_handle is not null and is_active;
create index if not exists business_profiles_active_idx
  on public.business_profiles (is_active, is_verified);
