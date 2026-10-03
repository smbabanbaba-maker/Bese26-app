-- Store the phone number collected during signup in the private contacts table.
-- Phone numbers remain protected by profile_contacts RLS and are never added to
-- the public profiles table.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    nullif(lower(coalesce(new.raw_user_meta_data ->> 'username', '')), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'bese26 user'), '@', 1))
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    updated_at = timezone('utc', now());

  insert into public.profile_contacts (profile_id, phone)
  values (new.id, v_phone)
  on conflict (profile_id) do update set
    phone = coalesce(nullif(public.profile_contacts.phone, ''), excluded.phone),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

-- Backfill numbers already supplied during registration. Existing manually saved
-- contact numbers are preserved and never overwritten by signup metadata.
insert into public.profile_contacts (profile_id, phone)
select u.id, nullif(trim(u.raw_user_meta_data ->> 'phone'), '')
from auth.users u
where nullif(trim(u.raw_user_meta_data ->> 'phone'), '') is not null
on conflict (profile_id) do update set
  phone = coalesce(nullif(public.profile_contacts.phone, ''), excluded.phone),
  updated_at = timezone('utc', now());

revoke all on function private.handle_new_user() from public;
