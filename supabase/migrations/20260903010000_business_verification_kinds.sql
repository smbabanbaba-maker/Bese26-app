-- Business verification is separate from personal profile verification.
alter table public.verification_applications
  add column if not exists business_registration_type text;

alter table public.verification_applications
  drop constraint if exists verification_applications_business_registration_type_check;
alter table public.verification_applications
  add constraint verification_applications_business_registration_type_check
  check (business_registration_type is null or business_registration_type in ('registered', 'unregistered'));

alter table public.business_profiles
  add column if not exists verification_kind text;

alter table public.business_profiles
  drop constraint if exists business_profiles_verification_kind_check;
alter table public.business_profiles
  add constraint business_profiles_verification_kind_check
  check (verification_kind is null or verification_kind in ('registered', 'unregistered'));

create index if not exists verification_applications_business_kind_idx
  on public.verification_applications (verification_type, business_registration_type, status);
