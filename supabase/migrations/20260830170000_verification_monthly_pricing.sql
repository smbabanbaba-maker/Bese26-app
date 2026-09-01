-- Verification pricing: one simple monthly fee for personal/seller and business review.
-- The monthly fee is fixed server-side at NGN 3,500 (350,000 kobo).
alter table public.verification_applications
  add column if not exists duration_months integer not null default 1;

alter table public.verification_applications
  drop constraint if exists verification_duration_months_check;

alter table public.verification_applications
  add constraint verification_duration_months_check check (duration_months between 1 and 12);

alter table public.verification_applications
  add column if not exists monthly_fee_kobo integer generated always as (350000) stored;

alter table public.verification_applications
  add column if not exists expires_at timestamptz;

alter table public.profiles
  add column if not exists verification_expires_at timestamptz;

alter table public.business_profiles
  add column if not exists verification_expires_at timestamptz;

alter table public.verification_applications
  add column if not exists total_fee_kobo integer generated always as (350000 * duration_months) stored;

comment on column public.verification_applications.duration_months is 'Requested verification duration in whole months, from 1 to 12.';
comment on column public.verification_applications.monthly_fee_kobo is 'Fixed monthly verification fee: NGN 3,500, stored in kobo.';
comment on column public.verification_applications.total_fee_kobo is 'Server-calculated total verification fee: monthly fee multiplied by duration_months.';
comment on column public.verification_applications.expires_at is 'Verification validity end date, set when an application is approved.';
comment on column public.profiles.verification_expires_at is 'Personal/seller verification validity end date.';
comment on column public.business_profiles.verification_expires_at is 'Business verification validity end date.';
