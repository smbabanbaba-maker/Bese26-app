-- Bese26 latest safe patch for an existing Supabase database.
-- Run this file only; do not rerun the complete 83-migration bundle.

-- 1) Manual Admin verification by registered email + audit trail
-- Restore the moderator helpers first in case the earlier bundle stopped before these migrations.
create or replace function private.is_bese26_owner_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = auth.uid()
      and lower(coalesce(u.email, '')) = 'smbabanbaba@gmail.com'
      and p.app_role = 'admin'
      and coalesce(p.admin_suspended, false) = false
  );
$$;
revoke all on function private.is_bese26_owner_admin() from public, anon;
grant execute on function private.is_bese26_owner_admin() to authenticated;

create or replace function private.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_bese26_owner_admin();
$$;
revoke all on function private.is_moderator_or_admin() from public, anon;
grant execute on function private.is_moderator_or_admin() to authenticated;

create or replace function public.current_user_can_moderate()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_bese26_owner_admin();
$$;
revoke all on function public.current_user_can_moderate() from public, anon;
grant execute on function public.current_user_can_moderate() to authenticated;

create table if not exists public.admin_verification_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  grant_type text not null default 'manual_email',
  note text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_verification_grants_user_idx
on public.admin_verification_grants(user_id, created_at desc);

alter table public.admin_verification_grants enable row level security;

drop policy if exists admin_verification_grants_moderator_read
on public.admin_verification_grants;

create policy admin_verification_grants_moderator_read
on public.admin_verification_grants
for select to authenticated
using (public.current_user_can_moderate());

create or replace function public.admin_grant_verification_by_email(
  p_email text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_email text := lower(trim(p_email));
  v_note text := nullif(trim(p_note), '');
  v_user_id uuid;
  v_profile public.profiles;
  v_business public.business_profiles;
  v_business_verified boolean := false;
begin
  if not public.current_user_can_moderate() then
    raise exception 'MODERATOR_REQUIRED';
  end if;
  if v_email is null or v_email = '' then
    raise exception 'EMAIL_REQUIRED';
  end if;
  if v_note is null then
    raise exception 'REASON_REQUIRED';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_user_id is null then
    raise exception 'USER_EMAIL_NOT_FOUND';
  end if;

  update public.profiles
  set is_verified = true,
      updated_at = timezone('utc', now())
  where id = v_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  update public.business_profiles
  set is_verified = true,
      verification_status = 'verified',
      verified_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where profile_id = v_user_id
  returning * into v_business;

  v_business_verified := coalesce(v_business.is_verified, false);

  insert into public.admin_verification_grants (user_id, email, actor_id, note)
  values (v_user_id, v_email, auth.uid(), v_note);

  return jsonb_build_object(
    'user_id', v_user_id,
    'email', v_email,
    'display_name', v_profile.display_name,
    'username', v_profile.username,
    'profile_verified', v_profile.is_verified,
    'business_verified', v_business_verified,
    'note', v_note
  );
end;
$$;

revoke all on function public.admin_grant_verification_by_email(text, text)
from public, anon;

grant execute on function public.admin_grant_verification_by_email(text, text)
to authenticated;

-- 2) Public Miniweb follower/following counts and public relationship cards
drop policy if exists profile_follows_public_read
on public.profile_follows;

create policy profile_follows_public_read
on public.profile_follows
for select to anon, authenticated
using (true);

grant select on public.profile_follows to anon, authenticated;

-- Verification checks after this patch:
-- select to_regclass('public.admin_verification_grants');
-- select to_regprocedure('public.admin_grant_verification_by_email(text,text)');
-- select public.current_user_can_moderate();
