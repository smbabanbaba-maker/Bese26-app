-- Final phone ownership rule for profile contacts.
-- Phone verification/SMS is intentionally not enabled; this only stores the
-- number and prevents the same normalized number being assigned to another user.

drop function if exists public.phone_is_registered(text);

create or replace function public.phone_is_registered(p_phone text, p_exclude_profile_id uuid default null)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1
      from public.profile_contacts pc
     where private.normalize_login_phone(pc.phone) = private.normalize_login_phone(p_phone)
       and (p_exclude_profile_id is null or pc.profile_id <> p_exclude_profile_id)
  );
$$;

revoke all on function public.phone_is_registered(text, uuid) from public;
grant execute on function public.phone_is_registered(text, uuid) to anon, authenticated;

create or replace function private.guard_profile_contact_phone()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_normalized text := private.normalize_login_phone(new.phone);
begin
  if new.phone is null or trim(new.phone) = '' then
    new.phone := null;
    return new;
  end if;

  if v_normalized is null then
    raise exception 'INVALID_NIGERIAN_PHONE';
  end if;

  if exists (
    select 1
      from public.profile_contacts pc
     where pc.profile_id <> new.profile_id
       and private.normalize_login_phone(pc.phone) = v_normalized
  ) then
    raise exception 'PHONE_ALREADY_REGISTERED';
  end if;

  new.phone := v_normalized;
  return new;
end;
$$;

drop trigger if exists profile_contacts_phone_guard on public.profile_contacts;
create trigger profile_contacts_phone_guard
before insert or update of phone on public.profile_contacts
for each row execute procedure private.guard_profile_contact_phone();

revoke all on function private.guard_profile_contact_phone() from public;
