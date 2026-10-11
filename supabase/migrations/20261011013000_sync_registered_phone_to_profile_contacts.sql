-- Keep the phone entered during registration available to listing contact actions.
-- profile_contacts remains the user-editable source of truth after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, country)
  values (
    new.id,
    nullif(lower(coalesce(new.raw_user_meta_data ->> 'username', '')), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'bese26 user'), '@', 1)),
    'Nigeria'
  )
  on conflict (id) do update set display_name = excluded.display_name, country = coalesce(public.profiles.country, excluded.country), updated_at = timezone('utc', now());

  insert into public.profile_contacts (profile_id, phone, whatsapp)
  select new.id,
         nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
         nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  where nullif(trim(new.raw_user_meta_data ->> 'phone'), '') is not null
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

-- Backfill only accounts without a profile_contacts row. Existing empty rows
-- are respected so users can intentionally remove their registered number.
insert into public.profile_contacts (profile_id, phone, whatsapp)
select u.id,
       nullif(trim(u.raw_user_meta_data ->> 'phone'), ''),
       nullif(trim(u.raw_user_meta_data ->> 'phone'), '')
from auth.users u
where nullif(trim(u.raw_user_meta_data ->> 'phone'), '') is not null
  and not exists (select 1 from public.profile_contacts pc where pc.profile_id = u.id)
on conflict (profile_id) do nothing;
