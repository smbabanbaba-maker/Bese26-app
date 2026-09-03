alter table public.verification_applications
  add column if not exists registration_number text,
  add column if not exists business_address text,
  add column if not exists personal_business_name text,
  add column if not exists business_explanation text;

create index if not exists verification_applications_registration_type_idx
  on public.verification_applications (business_registration_type, status);
