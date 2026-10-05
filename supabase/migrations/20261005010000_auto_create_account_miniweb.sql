-- Automatically give every Bese26 account a public Miniweb identity.
-- The personal account remains the owner; no second login is created.

create or replace function private.ensure_account_miniweb(p_profile_id uuid, p_display_name text, p_username text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := coalesce(nullif(trim(p_display_name), ''), 'Bese26 user');
  v_base text := lower(coalesce(nullif(trim(p_username), ''), v_name));
  v_handle text;
  v_suffix text := substr(replace(p_profile_id::text, '-', ''), 1, 6);
  v_attempt integer := 0;
begin
  if exists (select 1 from public.business_profiles where profile_id = p_profile_id) then
    return;
  end if;

  v_handle := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_handle := trim(both '-' from left(v_handle, 30));
  if length(v_handle) < 3 then
    v_handle := 'member-' || v_suffix;
  end if;

  while exists (select 1 from public.business_profiles where lower(business_handle) = lower(v_handle) and is_active) loop
    v_attempt := v_attempt + 1;
    v_handle := left(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), 22) || '-' || v_suffix || case when v_attempt > 1 then '-' || v_attempt::text else '' end;
    v_handle := trim(both '-' from left(v_handle, 30));
  end loop;

  insert into public.business_profiles (profile_id, business_name, business_handle, email, country)
  select p_profile_id, v_name, v_handle, u.email, 'Nigeria'
  from auth.users u
  where u.id = p_profile_id
  on conflict (profile_id) do nothing;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'bese26 user'), '@', 1));
  v_username text := nullif(lower(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display_name)
  on conflict (id) do update set display_name = excluded.display_name, updated_at = timezone('utc', now());

  perform private.ensure_account_miniweb(new.id, v_display_name, v_username);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

-- Existing accounts receive the same direct dashboard behavior on migration.
do $$
declare
  r record;
begin
  for r in
    select p.id, p.display_name, p.username
    from public.profiles p
    left join public.business_profiles b on b.profile_id = p.id
    where b.profile_id is null
  loop
    perform private.ensure_account_miniweb(r.id, r.display_name, r.username);
  end loop;
end;
$$;
