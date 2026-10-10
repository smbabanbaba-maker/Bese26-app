-- Give every new account a public profile handle, even when signup leaves
-- the optional username field empty. The handle is derived from the name and
-- receives a short user-id suffix only when needed for uniqueness.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := private.normalize_login_phone(new.raw_user_meta_data ->> 'phone');
  v_display_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'bese26 user'), '@', 1));
  v_requested text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  v_base text := regexp_replace(lower(coalesce(v_requested, v_display_name)), '[^a-z0-9]+', '-', 'g');
  v_suffix text := substr(replace(new.id::text, '-', ''), 1, 6);
  v_username text;
  v_attempt integer := 0;
begin
  if v_phone is not null and exists (
    select 1 from public.profile_contacts pc
    where private.normalize_login_phone(pc.phone) = v_phone
      and pc.profile_id <> new.id
  ) then
    raise exception 'PHONE_ALREADY_REGISTERED';
  end if;

  v_base := trim(both '-' from left(v_base, 30));
  if length(v_base) < 3 then v_base := 'member'; end if;
  v_username := v_base;
  while exists (select 1 from public.profiles p where lower(p.username) = lower(v_username) and p.id <> new.id) loop
    v_attempt := v_attempt + 1;
    v_username := trim(both '-' from left(v_base, 22)) || '-' || v_suffix || case when v_attempt > 1 then '-' || v_attempt::text else '' end;
    v_username := left(v_username, 30);
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display_name)
  on conflict (id) do update set
    username = coalesce(nullif(public.profiles.username, ''), excluded.username),
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

revoke all on function private.handle_new_user() from public;
