-- Allow password login with either the account email or its registered phone.
-- The resolver is intentionally narrow: it only returns the auth email needed by
-- Supabase signInWithPassword and does not expose profile/contact rows directly.

create or replace function private.normalize_login_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g') ~ '^\+234[789][0-9]{9}$'
      then regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g')
    when regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g') ~ '^234[789][0-9]{9}$'
      then '+' || regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g')
    when regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g') ~ '^0[789][0-9]{9}$'
      then '+234' || substr(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), 2)
    else null
  end;
$$;

create or replace function public.resolve_login_email(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public, auth, private
as $$
declare
  v_identifier text := lower(trim(coalesce(p_identifier, '')));
  v_phone text;
  v_email text;
begin
  if v_identifier ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return v_identifier;
  end if;

  v_phone := private.normalize_login_phone(v_identifier);
  if v_phone is null then
    return null;
  end if;

  -- A phone can identify only one account. Ambiguous legacy duplicates are
  -- deliberately rejected rather than signing into the wrong account.
  select lower(au.email) into v_email
    from public.profile_contacts pc
    join auth.users au on au.id = pc.profile_id
   where private.normalize_login_phone(pc.phone) = v_phone
   group by lower(au.email)
  having count(*) = 1
   limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- New signup accounts cannot register a phone already attached to another
-- profile. Existing duplicate legacy rows remain safe and require email login.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := private.normalize_login_phone(new.raw_user_meta_data ->> 'phone');
begin
  if v_phone is not null and exists (
    select 1 from public.profile_contacts pc
    where private.normalize_login_phone(pc.phone) = v_phone
      and pc.profile_id <> new.id
  ) then
    raise exception 'PHONE_ALREADY_REGISTERED';
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    nullif(lower(coalesce(new.raw_user_meta_data ->> 'username', '')), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'bese26 user'), '@', 1))
  )
  on conflict (id) do update set display_name = excluded.display_name, updated_at = timezone('utc', now());

  insert into public.profile_contacts (profile_id, phone)
  values (new.id, v_phone)
  on conflict (profile_id) do update set phone = coalesce(nullif(public.profile_contacts.phone, ''), excluded.phone), updated_at = timezone('utc', now());

  return new;
end;
$$;
