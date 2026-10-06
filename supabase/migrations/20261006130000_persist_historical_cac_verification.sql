-- Persist historical CAC approval on the Personal Profile.
-- A CAC approval remains a public trust credential even when a legacy
-- business_profiles row is inactive or its subscription-backed expiry passes.

alter table public.profiles
  add column if not exists cac_verified_name text,
  add column if not exists cac_verified_at timestamptz;

-- Backfill every profile that has ever had an approved CAC application.
-- DISTINCT ON keeps the most recent historical approval per user while
-- preserving an existing profile-level value if one was already written.
with approved as (
  select distinct on (user_id)
    user_id,
    nullif(trim(coalesce(cac_registered_name, business_name)), '') as verified_name,
    coalesce(verified_at, reviewed_at, created_at) as verified_at
  from public.verification_applications
  where verification_type = 'business'
    and status = 'verified'
    and nullif(trim(coalesce(cac_registered_name, business_name)), '') is not null
  order by user_id, coalesce(verified_at, reviewed_at, created_at) desc nulls last, created_at desc
)
update public.profiles p
set cac_verified_name = coalesce(nullif(trim(p.cac_verified_name), ''), approved.verified_name),
    cac_verified_at = coalesce(p.cac_verified_at, approved.verified_at),
    updated_at = timezone('utc', now())
from approved
where p.id = approved.user_id
  and (nullif(trim(p.cac_verified_name), '') is null or p.cac_verified_at is null);

-- Also preserve older approvals that predate the verification application
-- fields, where the legacy business row is still marked verified.
update public.profiles p
set cac_verified_name = coalesce(nullif(trim(p.cac_verified_name), ''), nullif(trim(bp.business_name), '')),
    cac_verified_at = coalesce(p.cac_verified_at, bp.verified_at, bp.created_at),
    updated_at = timezone('utc', now())
from public.business_profiles bp
where bp.profile_id = p.id
  and bp.is_verified = true
  and nullif(trim(bp.business_name), '') is not null
  and nullif(trim(p.cac_verified_name), '') is null;

create or replace function public.persist_cac_approval_on_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_type = 'business' and new.status = 'verified' then
    update public.profiles
    set cac_verified_name = nullif(trim(coalesce(new.cac_registered_name, new.business_name)), ''),
        cac_verified_at = coalesce(new.verified_at, new.reviewed_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
    where id = new.user_id
      and nullif(trim(coalesce(new.cac_registered_name, new.business_name)), '') is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists persist_cac_approval_on_profile on public.verification_applications;
create trigger persist_cac_approval_on_profile
after insert or update of status, cac_registered_name, business_name, verified_at
on public.verification_applications
for each row execute function public.persist_cac_approval_on_profile();

comment on column public.profiles.cac_verified_name is 'Public CAC name from the most recent approved CAC application; persists after legacy business subscription expiry.';
comment on column public.profiles.cac_verified_at is 'Timestamp of the most recent approved CAC application.';
