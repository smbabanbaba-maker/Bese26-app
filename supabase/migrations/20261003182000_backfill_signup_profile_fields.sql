-- Ensure users created before the complete signup trigger still have their
-- registration fields available in the normal profile/contact views.

update public.profiles p
set display_name = coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), p.display_name),
    updated_at = timezone('utc', now())
from auth.users u
where u.id = p.id
  and nullif(trim(u.raw_user_meta_data ->> 'display_name'), '') is not null;

update public.profiles p
set username = lower(nullif(trim(u.raw_user_meta_data ->> 'username'), '')),
    updated_at = timezone('utc', now())
from auth.users u
where u.id = p.id
  and p.username is null
  and nullif(trim(u.raw_user_meta_data ->> 'username'), '') is not null
  and not exists (
    select 1 from public.profiles other
    where other.id <> p.id
      and lower(other.username) = lower(trim(u.raw_user_meta_data ->> 'username'))
  );

insert into public.profile_contacts (profile_id, phone)
select u.id, private.normalize_login_phone(u.raw_user_meta_data ->> 'phone')
from auth.users u
where private.normalize_login_phone(u.raw_user_meta_data ->> 'phone') is not null
  and not exists (
    select 1 from public.profile_contacts pc
    where pc.profile_id = u.id
  )
  and not exists (
    select 1 from public.profile_contacts other
    where private.normalize_login_phone(other.phone) = private.normalize_login_phone(u.raw_user_meta_data ->> 'phone')
  )
on conflict (profile_id) do nothing;
