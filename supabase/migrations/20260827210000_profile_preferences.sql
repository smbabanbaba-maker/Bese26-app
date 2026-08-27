-- Persistent preferences for the authenticated Bese26 profile.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profile_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  language text not null default 'English' check (language in ('English', 'Hausa', 'Yoruba', 'Igbo', 'Kanuri')),
  currency text not null default 'NGN' check (currency = 'NGN'),
  date_format text not null default 'DD/MM/YYYY',
  number_format text not null default 'en-NG',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  profile_visibility boolean not null default true,
  show_online_status boolean not null default true,
  show_phone_number boolean not null default false,
  show_email boolean not null default false,
  show_approximate_location boolean not null default true,
  search_visibility boolean not null default true,
  activity_visibility boolean not null default true,
  personalized_recommendations boolean not null default true,
  in_app_notifications boolean not null default true,
  email_notifications boolean not null default true,
  buyer_messages boolean not null default true,
  seller_messages boolean not null default true,
  read_receipts boolean not null default true,
  message_requests boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profile_preferences_updated_at
before update on public.profile_preferences
for each row execute procedure public.set_updated_at();

alter table public.profile_preferences enable row level security;

drop policy if exists profile_preferences_self_read on public.profile_preferences;
create policy profile_preferences_self_read on public.profile_preferences
for select to authenticated using (profile_id = auth.uid());

drop policy if exists profile_preferences_self_insert on public.profile_preferences;
create policy profile_preferences_self_insert on public.profile_preferences
for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists profile_preferences_self_update on public.profile_preferences;
create policy profile_preferences_self_update on public.profile_preferences
for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

grant select, insert, update on public.profile_preferences to authenticated;
