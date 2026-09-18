-- Bese26 complete Supabase migration bundle
-- Generated from supabase/migrations/*.sql in timestamp order.
-- Do not run this bundle if these migrations are already recorded as applied in Supabase.


-- ================================================================
-- SOURCE: supabase/migrations/20260827060000_marketplace_foundation.sql
-- ================================================================

-- Bese26 marketplace foundation
-- Target: Supabase project slxsbvuskgkacmtkkrmj only
-- No subscription, payment, fee, checkout, or Shopify tables are included.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'bese26 user',
  avatar_path text,
  bio text,
  city text,
  state text,
  country text not null default 'Nigeria',
  is_verified boolean not null default false,
  seller_rating numeric(3,2) not null default 0 check (seller_rating >= 0 and seller_rating <= 5),
  seller_rating_count integer not null default 0 check (seller_rating_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  whatsapp text,
  allow_calls boolean not null default true,
  allow_whatsapp boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  icon text,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.category_fields (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'select', 'boolean', 'multiselect')),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  is_required boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (category_id, field_key)
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory_id uuid references public.categories(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 160),
  description text not null default '' check (char_length(description) <= 10000),
  price numeric(14,2) check (price is null or price >= 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  pricing_type text not null default 'fixed' check (pricing_type in ('fixed', 'negotiable', 'contact')),
  condition text,
  quantity numeric(14,3) check (quantity is null or quantity >= 0),
  unit text,
  city text,
  state text,
  country text not null default 'Nigeria',
  delivery_options jsonb not null default '[]'::jsonb check (jsonb_typeof(delivery_options) = 'array'),
  contact_preference text not null default 'chat' check (contact_preference in ('chat', 'call', 'whatsapp', 'chat_call')),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  status text not null default 'pending' check (status in ('draft', 'pending', 'active', 'paused', 'sold', 'archived', 'rejected')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  published_at timestamptz,
  expires_at timestamptz,
  views_count bigint not null default 0 check (views_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_seconds numeric(10,2) check (duration_seconds is null or duration_seconds >= 0),
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.listing_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, listing_id)
);

create table if not exists public.listing_drafts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  last_saved_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (buyer_id <> seller_id),
  unique (listing_id, buyer_id, seller_id)
);

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  participant_role text not null check (participant_role in ('buyer', 'seller')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  attachment_path text,
  attachment_mime_type text,
  attachment_size_bytes bigint check (attachment_size_bytes is null or attachment_size_bytes >= 0),
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (nullif(trim(body), '') is not null or attachment_path is not null)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 3000),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (reviewer_id <> reviewee_id),
  unique (listing_id, reviewer_id, reviewee_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  notification_type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists listings_public_feed_idx on public.listings (status, moderation_status, created_at desc);
create index if not exists listings_seller_idx on public.listings (seller_id, created_at desc);
create index if not exists listings_category_idx on public.listings (category_id, subcategory_id, created_at desc);
create index if not exists listing_media_listing_idx on public.listing_media (listing_id, sort_order);
create index if not exists favorites_user_idx on public.listing_favorites (user_id, created_at desc);
create index if not exists drafts_seller_idx on public.listing_drafts (seller_id, updated_at desc);
create index if not exists participants_user_idx on public.conversation_participants (user_id, conversation_id);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id, status, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    nullif(lower(coalesce(new.raw_user_meta_data ->> 'username', '')), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'bese26 user'), '@', 1))
  )
  on conflict (id) do update set display_name = excluded.display_name, updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

create or replace function public.user_owns_listing_storage_path(p_name text)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  folders text[];
  listing_uuid uuid;
begin
  folders := storage.foldername(p_name);
  if coalesce(array_length(folders, 1), 0) < 2 then return false; end if;
  if folders[1] <> auth.uid()::text then return false; end if;
  begin
    listing_uuid := folders[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return exists (select 1 from public.listings l where l.id = listing_uuid and l.seller_id = auth.uid());
end;
$$;

create or replace function public.seed_conversation_participants()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.conversation_participants (conversation_id, user_id, participant_role)
  values (new.id, new.buyer_id, 'buyer'), (new.id, new.seller_id, 'seller')
  on conflict (conversation_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists seed_conversation_participants_trigger on public.conversations;
create trigger seed_conversation_participants_trigger
after insert on public.conversations
for each row execute procedure public.seed_conversation_participants();

create or replace function public.touch_conversation_from_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at, updated_at = timezone('utc', now())
  where id = new.conversation_id;
  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  select cp.user_id, new.sender_id, 'new_message', 'New message', left(coalesce(new.body, 'You received an attachment.'), 160), jsonb_build_object('conversation_id', new.conversation_id)
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id and cp.user_id <> new.sender_id;
  return new;
end;
$$;

drop trigger if exists touch_conversation_from_message_trigger on public.messages;
create trigger touch_conversation_from_message_trigger
after insert on public.messages
for each row execute procedure public.touch_conversation_from_message();

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger profile_contacts_updated_at before update on public.profile_contacts for each row execute procedure public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
create trigger category_fields_updated_at before update on public.category_fields for each row execute procedure public.set_updated_at();
create trigger listings_updated_at before update on public.listings for each row execute procedure public.set_updated_at();
create trigger listing_media_updated_at before update on public.listing_media for each row execute procedure public.set_updated_at();
create trigger drafts_updated_at before update on public.listing_drafts for each row execute procedure public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute procedure public.set_updated_at();
create trigger reviews_updated_at before update on public.reviews for each row execute procedure public.set_updated_at();

insert into public.categories (name, slug, icon, sort_order) values
  ('Phones & Tablets', 'phones-tablets', 'smartphone', 10),
  ('Electronics', 'electronics', 'laptop', 20),
  ('Vehicles', 'vehicles', 'car', 30),
  ('Property', 'property', 'house', 40),
  ('Fashion', 'fashion', 'shirt', 50),
  ('Agriculture', 'agriculture', 'sprout', 60),
  ('Jobs & Services', 'jobs-services', 'briefcase', 70),
  ('Home & Garden', 'home-garden', 'armchair', 80),
  ('Beauty & Health', 'beauty-health', 'heart-pulse', 90)
on conflict (slug) do update set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order, is_active = true;

insert into public.categories (parent_id, name, slug, icon, sort_order)
select c.id, x.name, x.slug, x.icon, x.sort_order
from public.categories c
join (values
  ('phones-tablets', 'Smartphones', 'smartphone', 'smartphones', 10),
  ('phones-tablets', 'Tablets', 'tablet', 'tablets', 20),
  ('electronics', 'Laptops', 'laptop', 'laptops', 10),
  ('electronics', 'TVs & Audio', 'tv', 'tvs-audio', 20),
  ('vehicles', 'Cars', 'car', 'cars', 10),
  ('vehicles', 'Motorcycles', 'bike', 'motorcycles', 20),
  ('property', 'Houses', 'house', 'houses', 10),
  ('property', 'Land', 'map', 'land', 20),
  ('fashion', 'Clothing', 'shirt', 'clothing', 10),
  ('agriculture', 'Crops', 'wheat', 'crops', 10),
  ('agriculture', 'Livestock', 'paw-print', 'livestock', 20),
  ('jobs-services', 'Repairs', 'wrench', 'repairs', 10),
  ('jobs-services', 'Professional Services', 'briefcase', 'professional-services', 20)
) as x(parent_slug, name, icon, slug, sort_order) on c.slug = x.parent_slug
on conflict (slug) do update set parent_id = excluded.parent_id, name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order, is_active = true;

insert into public.category_fields (category_id, field_key, label, field_type, options, sort_order)
select c.id, x.field_key, x.label, x.field_type, x.options::jsonb, x.sort_order
from public.categories c
join (values
  ('vehicles', 'make', 'Make', 'text', '[]', 10),
  ('vehicles', 'model', 'Model', 'text', '[]', 20),
  ('vehicles', 'year', 'Year', 'number', '[]', 30),
  ('vehicles', 'transmission', 'Transmission', 'select', '["Automatic","Manual"]', 40),
  ('electronics', 'brand', 'Brand', 'text', '[]', 10),
  ('electronics', 'model', 'Model', 'text', '[]', 20),
  ('electronics', 'storage', 'Storage', 'text', '[]', 30),
  ('property', 'property_type', 'Property type', 'select', '["House","Apartment","Land","Commercial"]', 10),
  ('property', 'bedrooms', 'Bedrooms', 'number', '[]', 20),
  ('property', 'furnished', 'Furnished', 'boolean', '[]', 30),
  ('agriculture', 'produce_type', 'Produce type', 'text', '[]', 10),
  ('agriculture', 'quantity', 'Quantity', 'number', '[]', 20),
  ('agriculture', 'unit', 'Unit', 'select', '["item","kg","bag","crate","litre"]', 30),
  ('fashion', 'size', 'Size', 'select', '["XS","S","M","L","XL","XXL"]', 10),
  ('jobs-services', 'service_type', 'Service type', 'text', '[]', 10),
  ('jobs-services', 'experience_years', 'Experience (years)', 'number', '[]', 20)
) as x(category_slug, field_key, label, field_type, options, sort_order) on c.slug = x.category_slug
on conflict (category_id, field_key) do update set label = excluded.label, field_type = excluded.field_type, options = excluded.options, sort_order = excluded.sort_order, is_active = true;

alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.categories enable row level security;
alter table public.category_fields enable row level security;
alter table public.listings enable row level security;
alter table public.listing_media enable row level security;
alter table public.listing_favorites enable row level security;
alter table public.listing_drafts enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profile_contacts_self_read on public.profile_contacts;
create policy profile_contacts_self_read on public.profile_contacts for select to authenticated using (profile_id = auth.uid());
drop policy if exists profile_contacts_self_insert on public.profile_contacts;
create policy profile_contacts_self_insert on public.profile_contacts for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists profile_contacts_self_update on public.profile_contacts;
create policy profile_contacts_self_update on public.profile_contacts for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists profile_contacts_self_delete on public.profile_contacts;
create policy profile_contacts_self_delete on public.profile_contacts for delete to authenticated using (profile_id = auth.uid());

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select to anon, authenticated using (is_active = true);
drop policy if exists category_fields_public_read on public.category_fields;
create policy category_fields_public_read on public.category_fields for select to anon, authenticated using (is_active = true);

drop policy if exists listings_public_or_owner_read on public.listings;
create policy listings_public_or_owner_read on public.listings for select to anon, authenticated using ((status = 'active' and moderation_status = 'approved') or seller_id = auth.uid());
drop policy if exists listings_owner_insert on public.listings;
create policy listings_owner_insert on public.listings for insert to authenticated with check (seller_id = auth.uid());
drop policy if exists listings_owner_update on public.listings;
create policy listings_owner_update on public.listings for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());
drop policy if exists listings_owner_delete on public.listings;
create policy listings_owner_delete on public.listings for delete to authenticated using (seller_id = auth.uid());

drop policy if exists listing_media_public_or_owner_read on public.listing_media;
create policy listing_media_public_or_owner_read on public.listing_media for select to anon, authenticated using (exists (select 1 from public.listings l where l.id = listing_id and ((l.status = 'active' and l.moderation_status = 'approved') or l.seller_id = auth.uid())));
drop policy if exists listing_media_owner_insert on public.listing_media;
create policy listing_media_owner_insert on public.listing_media for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
drop policy if exists listing_media_owner_update on public.listing_media;
create policy listing_media_owner_update on public.listing_media for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists listing_media_owner_delete on public.listing_media;
create policy listing_media_owner_delete on public.listing_media for delete to authenticated using (owner_id = auth.uid());

drop policy if exists favorites_owner_read on public.listing_favorites;
create policy favorites_owner_read on public.listing_favorites for select to authenticated using (user_id = auth.uid());
drop policy if exists favorites_owner_insert on public.listing_favorites;
create policy favorites_owner_insert on public.listing_favorites for insert to authenticated with check (user_id = auth.uid());
drop policy if exists favorites_owner_delete on public.listing_favorites;
create policy favorites_owner_delete on public.listing_favorites for delete to authenticated using (user_id = auth.uid());

drop policy if exists drafts_owner_read on public.listing_drafts;
create policy drafts_owner_read on public.listing_drafts for select to authenticated using (seller_id = auth.uid());
drop policy if exists drafts_owner_insert on public.listing_drafts;
create policy drafts_owner_insert on public.listing_drafts for insert to authenticated with check (seller_id = auth.uid());
drop policy if exists drafts_owner_update on public.listing_drafts;
create policy drafts_owner_update on public.listing_drafts for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());
drop policy if exists drafts_owner_delete on public.listing_drafts;
create policy drafts_owner_delete on public.listing_drafts for delete to authenticated using (seller_id = auth.uid());

drop policy if exists conversations_participant_read on public.conversations;
create policy conversations_participant_read on public.conversations for select to authenticated using (buyer_id = auth.uid() or seller_id = auth.uid());
drop policy if exists conversations_participant_insert on public.conversations;
create policy conversations_participant_insert on public.conversations for insert to authenticated with check (buyer_id = auth.uid() or seller_id = auth.uid());
drop policy if exists conversations_participant_update on public.conversations;
create policy conversations_participant_update on public.conversations for update to authenticated using (buyer_id = auth.uid() or seller_id = auth.uid()) with check (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists conversation_participants_self_read on public.conversation_participants;
create policy conversation_participants_self_read on public.conversation_participants for select to authenticated using (user_id = auth.uid());
drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read on public.messages for select to authenticated using (public.is_conversation_participant(conversation_id));
drop policy if exists messages_participant_insert on public.messages;
create policy messages_participant_insert on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));

drop policy if exists reviews_public_or_related_read on public.reviews;
create policy reviews_public_or_related_read on public.reviews for select to anon, authenticated using (status = 'published' or reviewer_id = auth.uid() or reviewee_id = auth.uid());
drop policy if exists reviews_reviewer_insert on public.reviews;
create policy reviews_reviewer_insert on public.reviews for insert to authenticated with check (reviewer_id = auth.uid() and reviewer_id <> reviewee_id);
drop policy if exists reviews_reviewer_update on public.reviews;
create policy reviews_reviewer_update on public.reviews for update to authenticated using (reviewer_id = auth.uid() and status = 'pending') with check (reviewer_id = auth.uid() and status = 'pending');

drop policy if exists notifications_recipient_read on public.notifications;
create policy notifications_recipient_read on public.notifications for select to authenticated using (recipient_id = auth.uid());
drop policy if exists notifications_recipient_update on public.notifications;
create policy notifications_recipient_update on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

grant select on public.profiles, public.categories, public.category_fields, public.listings, public.listing_media, public.reviews to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profile_contacts, public.listing_favorites, public.listing_drafts to authenticated;
grant insert, update, delete on public.listings, public.listing_media to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select on public.conversation_participants to authenticated;
grant select, insert on public.messages to authenticated;
grant insert, update on public.reviews to authenticated;
grant select, update on public.notifications to authenticated;

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('listing-media', 'listing-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']::text[])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']::text[])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
end;
$$;

drop policy if exists listing_media_object_insert on storage.objects;
create policy listing_media_object_insert on storage.objects for insert to authenticated with check (bucket_id = 'listing-media' and public.user_owns_listing_storage_path(name));
drop policy if exists listing_media_object_update on storage.objects;
create policy listing_media_object_update on storage.objects for update to authenticated using (bucket_id = 'listing-media' and owner_id = auth.uid()::text) with check (bucket_id = 'listing-media' and owner_id = auth.uid()::text);
drop policy if exists listing_media_object_delete on storage.objects;
create policy listing_media_object_delete on storage.objects for delete to authenticated using (bucket_id = 'listing-media' and owner_id = auth.uid()::text);
drop policy if exists avatar_object_insert on storage.objects;
create policy avatar_object_insert on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatar_object_update on storage.objects;
create policy avatar_object_update on storage.objects for update to authenticated using (bucket_id = 'avatars' and owner_id = auth.uid()::text) with check (bucket_id = 'avatars' and owner_id = auth.uid()::text);
drop policy if exists avatar_object_delete on storage.objects;
create policy avatar_object_delete on storage.objects for delete to authenticated using (bucket_id = 'avatars' and owner_id = auth.uid()::text);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_publication p ON p.oid = pr.prpubid
      WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_publication p ON p.oid = pr.prpubid
      WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END;
$$;


-- ================================================================
-- SOURCE: supabase/migrations/20260827061000_secure_listing_media_bucket.sql
-- ================================================================

-- Bese26 storage hardening: only active approved listing media is publicly signable.

update storage.buckets
set public = false
where id = 'listing-media';

create or replace function public.is_public_listing_storage_path(p_name text)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  folders text[];
  listing_uuid uuid;
begin
  folders := storage.foldername(p_name);
  if coalesce(array_length(folders, 1), 0) < 2 then return false; end if;
  begin
    listing_uuid := folders[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return exists (
    select 1 from public.listings l
    where l.id = listing_uuid
      and l.status = 'active'
      and l.moderation_status = 'approved'
  );
end;
$$;

drop policy if exists listing_media_object_read on storage.objects;
create policy listing_media_object_read on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'listing-media'
  and (public.is_public_listing_storage_path(name) or owner_id = auth.uid()::text)
);


-- ================================================================
-- SOURCE: supabase/migrations/20260827062000_tighten_marketplace_policies.sql
-- ================================================================

-- Bese26 policy tightening: sellers submit pending listings; buyers may chat only about approved listings.

drop policy if exists listings_owner_insert on public.listings;
create policy listings_owner_insert on public.listings
for insert to authenticated
with check (
  seller_id = auth.uid()
  and status = 'pending'
  and moderation_status = 'pending'
);

drop policy if exists listings_owner_update on public.listings;
create policy listings_owner_update on public.listings
for update to authenticated
using (seller_id = auth.uid())
with check (
  seller_id = auth.uid()
  and moderation_status = 'pending'
  and status in ('draft', 'pending', 'paused', 'sold', 'archived')
);

drop policy if exists conversations_participant_insert on public.conversations;
create policy conversations_participant_insert on public.conversations
for insert to authenticated
with check (
  buyer_id = auth.uid()
  and buyer_id <> seller_id
  and listing_id is not null
  and exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.seller_id = seller_id
      and l.status = 'active'
      and l.moderation_status = 'approved'
  )
);

drop policy if exists reviews_reviewer_insert on public.reviews;
create policy reviews_reviewer_insert on public.reviews
for insert to authenticated
with check (
  reviewer_id = auth.uid()
  and reviewer_id <> reviewee_id
  and exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.seller_id = reviewee_id
      and l.status in ('sold', 'archived')
  )
);


-- ================================================================
-- SOURCE: supabase/migrations/20260827063000_harden_security_definer_functions.sql
-- ================================================================

-- Bese26 security remediation: keep trigger/RLS helper functions out of the exposed public API schema.

create schema if not exists private;
revoke all on schema private from public;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists seed_conversation_participants_trigger on public.conversations;
drop trigger if exists touch_conversation_from_message_trigger on public.messages;
drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists profile_contacts_updated_at on public.profile_contacts;
drop trigger if exists categories_updated_at on public.categories;
drop trigger if exists category_fields_updated_at on public.category_fields;
drop trigger if exists listings_updated_at on public.listings;
drop trigger if exists listing_media_updated_at on public.listing_media;
drop trigger if exists drafts_updated_at on public.listing_drafts;
drop trigger if exists conversations_updated_at on public.conversations;
drop trigger if exists reviews_updated_at on public.reviews;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    nullif(lower(coalesce(new.raw_user_meta_data ->> 'username', '')), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'bese26 user'), '@', 1))
  )
  on conflict (id) do update set display_name = excluded.display_name, updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function private.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

create or replace function private.user_owns_listing_storage_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  folders text[];
  listing_uuid uuid;
begin
  folders := storage.foldername(p_name);
  if coalesce(array_length(folders, 1), 0) < 2 then return false; end if;
  if folders[1] <> auth.uid()::text then return false; end if;
  begin
    listing_uuid := folders[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return exists (select 1 from public.listings l where l.id = listing_uuid and l.seller_id = auth.uid());
end;
$$;

create or replace function private.is_public_listing_storage_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  folders text[];
  listing_uuid uuid;
begin
  folders := storage.foldername(p_name);
  if coalesce(array_length(folders, 1), 0) < 2 then return false; end if;
  begin
    listing_uuid := folders[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return exists (
    select 1 from public.listings l
    where l.id = listing_uuid
      and l.status = 'active'
      and l.moderation_status = 'approved'
  );
end;
$$;

create or replace function private.seed_conversation_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.conversation_participants (conversation_id, user_id, participant_role)
  values (new.id, new.buyer_id, 'buyer'), (new.id, new.seller_id, 'seller')
  on conflict (conversation_id, user_id) do nothing;
  return new;
end;
$$;

create or replace function private.touch_conversation_from_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at, updated_at = timezone('utc', now())
  where id = new.conversation_id;
  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  select cp.user_id, new.sender_id, 'new_message', 'New message', left(coalesce(new.body, 'You received an attachment.'), 160), jsonb_build_object('conversation_id', new.conversation_id)
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id and cp.user_id <> new.sender_id;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();
create trigger seed_conversation_participants_trigger after insert on public.conversations for each row execute procedure private.seed_conversation_participants();
create trigger touch_conversation_from_message_trigger after insert on public.messages for each row execute procedure private.touch_conversation_from_message();
create trigger profiles_updated_at before update on public.profiles for each row execute procedure private.set_updated_at();
create trigger profile_contacts_updated_at before update on public.profile_contacts for each row execute procedure private.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute procedure private.set_updated_at();
create trigger category_fields_updated_at before update on public.category_fields for each row execute procedure private.set_updated_at();
create trigger listings_updated_at before update on public.listings for each row execute procedure private.set_updated_at();
create trigger listing_media_updated_at before update on public.listing_media for each row execute procedure private.set_updated_at();
create trigger drafts_updated_at before update on public.listing_drafts for each row execute procedure private.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute procedure private.set_updated_at();
create trigger reviews_updated_at before update on public.reviews for each row execute procedure private.set_updated_at();

drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read on public.messages for select to authenticated using (private.is_conversation_participant(conversation_id));
drop policy if exists messages_participant_insert on public.messages;
create policy messages_participant_insert on public.messages for insert to authenticated with check (sender_id = auth.uid() and private.is_conversation_participant(conversation_id));

drop policy if exists listing_media_object_insert on storage.objects;
create policy listing_media_object_insert on storage.objects for insert to authenticated with check (bucket_id = 'listing-media' and private.user_owns_listing_storage_path(name));
drop policy if exists listing_media_object_read on storage.objects;
create policy listing_media_object_read on storage.objects for select to anon, authenticated using (bucket_id = 'listing-media' and (private.is_public_listing_storage_path(name) or owner_id = auth.uid()::text));

drop function if exists public.set_updated_at();
drop function if exists public.handle_new_user();
drop function if exists public.is_conversation_participant(uuid);
drop function if exists public.user_owns_listing_storage_path(text);
drop function if exists public.is_public_listing_storage_path(text);
drop function if exists public.seed_conversation_participants();
drop function if exists public.touch_conversation_from_message();


-- ================================================================
-- SOURCE: supabase/migrations/20260827190000_admin_moderation.sql
-- ================================================================

-- Bese26 admin moderation: only designated admin profiles can review pending listings.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

alter table public.profiles
  add column if not exists app_role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_app_role_check;

alter table public.profiles
  add constraint profiles_app_role_check check (app_role in ('user', 'admin'));

create table if not exists public.listing_moderation_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('approve', 'reject')),
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.listing_moderation_events enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;

-- The user explicitly selected this existing account as the first admin.
update public.profiles
set app_role = 'admin'
where id in (
  select id from auth.users where lower(email) = 'smbabanbaba@gmail.com'
);

drop policy if exists listings_admin_pending_read on public.listings;
create policy listings_admin_pending_read on public.listings
for select to authenticated
using (
  private.is_admin()
  and status = 'pending'
  and moderation_status = 'pending'
);

drop policy if exists listing_media_admin_pending_read on public.listing_media;
create policy listing_media_admin_pending_read on public.listing_media
for select to authenticated
using (
  private.is_admin()
  and exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.status = 'pending'
      and l.moderation_status = 'pending'
  )
);

drop policy if exists listing_moderation_events_admin_read on public.listing_moderation_events;
create policy listing_moderation_events_admin_read on public.listing_moderation_events
for select to authenticated
using (private.is_admin());

-- Allow admins to read pending objects in the private listing-media bucket.
create or replace function private.admin_can_read_listing_storage_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  folders text[];
  listing_uuid uuid;
begin
  if not private.is_admin() then return false; end if;
  folders := storage.foldername(p_name);
  if coalesce(array_length(folders, 1), 0) < 2 then return false; end if;
  begin
    listing_uuid := folders[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return exists (
    select 1 from public.listings l
    where l.id = listing_uuid
      and l.status = 'pending'
      and l.moderation_status = 'pending'
  );
end;
$$;

revoke all on function private.admin_can_read_listing_storage_path(text) from public;

drop policy if exists listing_media_object_admin_read on storage.objects;
create policy listing_media_object_admin_read on storage.objects
for select to authenticated
using (bucket_id = 'listing-media' and private.admin_can_read_listing_storage_path(name));

create or replace function public.moderate_listing(
  p_listing_id uuid,
  p_action text,
  p_rejection_reason text default null
)
returns public.listings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  updated_listing public.listings;
  normalized_reason text := nullif(trim(coalesce(p_rejection_reason, '')), '');
begin
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'Moderation action must be approve or reject';
  end if;

  if p_action = 'approve' then
    update public.listings
    set status = 'active',
        moderation_status = 'approved',
        rejection_reason = null,
        published_at = coalesce(published_at, timezone('utc', now()))
    where id = p_listing_id
      and status = 'pending'
      and moderation_status = 'pending'
    returning * into updated_listing;
  else
    update public.listings
    set status = 'rejected',
        moderation_status = 'rejected',
        rejection_reason = normalized_reason
    where id = p_listing_id
      and status = 'pending'
      and moderation_status = 'pending'
    returning * into updated_listing;
  end if;

  if updated_listing.id is null then
    raise exception using errcode = 'P0002', message = 'Pending listing was not found or was already reviewed';
  end if;

  insert into public.listing_moderation_events (listing_id, admin_id, action, rejection_reason)
  values (updated_listing.id, auth.uid(), p_action, normalized_reason);

  return updated_listing;
end;
$$;

revoke all on function public.moderate_listing(uuid, text, text) from public, anon;
grant execute on function public.moderate_listing(uuid, text, text) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260827191000_admin_status_rpc.sql
-- ================================================================

-- Bese26 admin status RPC: expose only the current user's boolean admin status.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.is_admin();
$$;

revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260827192000_admin_status_invoker.sql
-- ================================================================

-- Bese26 admin status hardening: this read-only boolean helper needs no SECURITY DEFINER.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role = 'admin'
  );
$$;

revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260827193000_admin_policy_grants.sql
-- ================================================================

-- Bese26 RLS helper grants: allow policy evaluation to invoke private helpers.
-- The helpers remain outside exposed API schemas and keep SECURITY DEFINER search paths.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

grant execute on function private.is_admin() to authenticated;
grant execute on function private.admin_can_read_listing_storage_path(text) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260827200000_listing_resubmission.sql
-- ================================================================

-- Bese26: allow a seller to send a rejected listing back for review.
-- The RPC is deliberately narrow: it cannot edit listing content or approve a listing.

create or replace function public.resubmit_rejected_listing(p_listing_id uuid)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_listing public.listings;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  update public.listings
  set status = 'pending',
      moderation_status = 'pending',
      rejection_reason = null,
      published_at = null,
      updated_at = timezone('utc', now())
  where id = p_listing_id
    and seller_id = auth.uid()
    and status = 'rejected'
    and moderation_status = 'rejected'
  returning * into updated_listing;

  if updated_listing.id is null then
    raise exception using errcode = '42501', message = 'Only your rejected listings can be resubmitted';
  end if;

  return updated_listing;
end;
$$;

revoke all on function public.resubmit_rejected_listing(uuid) from public, anon;
grant execute on function public.resubmit_rejected_listing(uuid) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260827200500_revise_rejected_listing.sql
-- ================================================================

-- Bese26: revise a rejected listing and send the same listing back for moderation.
-- This does not create a new listing and cannot approve or publish it.

create or replace function public.revise_rejected_listing(
  p_listing_id uuid,
  p_category_id uuid,
  p_subcategory_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_city text,
  p_state text,
  p_currency text default 'NGN',
  p_pricing_type text default 'fixed',
  p_condition text default null,
  p_quantity numeric default null,
  p_unit text default null,
  p_country text default 'Nigeria',
  p_delivery_options jsonb default '[]'::jsonb,
  p_contact_preference text default 'chat',
  p_attributes jsonb default '{}'::jsonb
)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_listing public.listings;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if nullif(trim(coalesce(p_title, '')), '') is null
    or nullif(trim(coalesce(p_description, '')), '') is null
    or p_price is null
    or p_price <= 0
    or nullif(trim(coalesce(p_city, '')), '') is null
    or nullif(trim(coalesce(p_state, '')), '') is null then
    raise exception using errcode = '22023', message = 'Title, description, price, state, and city are required';
  end if;

  if not exists (select 1 from public.categories where id = p_category_id and is_active = true) then
    raise exception using errcode = '22023', message = 'Category is not available';
  end if;

  update public.listings
  set category_id = p_category_id,
      subcategory_id = p_subcategory_id,
      title = trim(p_title),
      description = trim(p_description),
      price = p_price,
      currency = coalesce(nullif(trim(p_currency), ''), 'NGN'),
      pricing_type = coalesce(nullif(trim(p_pricing_type), ''), 'fixed'),
      condition = nullif(trim(coalesce(p_condition, '')), ''),
      quantity = p_quantity,
      unit = nullif(trim(coalesce(p_unit, '')), ''),
      city = trim(p_city),
      state = trim(p_state),
      country = coalesce(nullif(trim(p_country), ''), 'Nigeria'),
      delivery_options = case when jsonb_typeof(coalesce(p_delivery_options, '[]'::jsonb)) = 'array' then p_delivery_options else '[]'::jsonb end,
      contact_preference = coalesce(nullif(trim(p_contact_preference), ''), 'chat'),
      attributes = case when jsonb_typeof(coalesce(p_attributes, '{}'::jsonb)) = 'object' then p_attributes else '{}'::jsonb end,
      status = 'pending',
      moderation_status = 'pending',
      rejection_reason = null,
      published_at = null,
      updated_at = timezone('utc', now())
  where id = p_listing_id
    and seller_id = auth.uid()
    and status = 'rejected'
    and moderation_status = 'rejected'
  returning * into updated_listing;

  if updated_listing.id is null then
    raise exception using errcode = '42501', message = 'Only your rejected listings can be revised';
  end if;

  return updated_listing;
end;
$$;

revoke all on function public.revise_rejected_listing(uuid, uuid, uuid, text, text, numeric, text, text, text, text, text, numeric, text, text, jsonb, text, jsonb) from public, anon;
grant execute on function public.revise_rejected_listing(uuid, uuid, uuid, text, text, numeric, text, text, text, text, text, numeric, text, text, jsonb, text, jsonb) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260827201500_moderation_roles_notifications.sql
-- ================================================================

-- Bese26: controlled moderation roles and real moderation notifications.
-- No new user is assigned a moderator role by this migration.

alter table public.profiles
drop constraint if exists profiles_app_role_check;

alter table public.profiles
add constraint profiles_app_role_check check (app_role in ('user', 'moderator', 'admin'));

-- Keep app_role outside ordinary profile self-service updates.
revoke insert, update on public.profiles from authenticated;
grant insert (id, username, display_name, avatar_path, bio, city, state, country) on public.profiles to authenticated;
grant update (username, display_name, avatar_path, bio, city, state, country) on public.profiles to authenticated;

create or replace function private.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role in ('moderator', 'admin')
  );
$$;

revoke all on function private.is_moderator_or_admin() from public;
grant execute on function private.is_moderator_or_admin() to authenticated;

create or replace function public.current_user_can_moderate()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role in ('moderator', 'admin')
  );
$$;

revoke all on function public.current_user_can_moderate() from public, anon;
grant execute on function public.current_user_can_moderate() to authenticated;

-- Moderators and admins can read the review queue and its audit history.
drop policy if exists listings_admin_pending_read on public.listings;
create policy listings_admin_pending_read on public.listings
for select to authenticated
using (
  private.is_moderator_or_admin()
  and status = 'pending'
  and moderation_status = 'pending'
);

drop policy if exists listing_media_admin_pending_read on public.listing_media;
create policy listing_media_admin_pending_read on public.listing_media
for select to authenticated
using (
  private.is_moderator_or_admin()
  and exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.status = 'pending'
      and l.moderation_status = 'pending'
  )
);

drop policy if exists listing_moderation_events_admin_read on public.listing_moderation_events;
create policy listing_moderation_events_admin_read on public.listing_moderation_events
for select to authenticated
using (private.is_moderator_or_admin());

create or replace function private.admin_can_read_listing_storage_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  folders text[];
  listing_uuid uuid;
begin
  if not private.is_moderator_or_admin() then return false; end if;
  folders := storage.foldername(p_name);
  if coalesce(array_length(folders, 1), 0) < 2 then return false; end if;
  begin
    listing_uuid := folders[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return exists (
    select 1 from public.listings l
    where l.id = listing_uuid
      and l.status = 'pending'
      and l.moderation_status = 'pending'
  );
end;
$$;

revoke all on function private.admin_can_read_listing_storage_path(text) from public;
grant execute on function private.admin_can_read_listing_storage_path(text) to authenticated;

drop policy if exists listing_media_object_admin_read on storage.objects;
create policy listing_media_object_admin_read on storage.objects
for select to authenticated
using (bucket_id = 'listing-media' and private.admin_can_read_listing_storage_path(name));

create or replace function public.moderate_listing(
  p_listing_id uuid,
  p_action text,
  p_rejection_reason text default null
)
returns public.listings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  updated_listing public.listings;
  normalized_reason text := nullif(trim(coalesce(p_rejection_reason, '')), '');
begin
  if not private.is_moderator_or_admin() then
    raise exception using errcode = '42501', message = 'Moderator access required';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'Moderation action must be approve or reject';
  end if;

  if p_action = 'reject' and normalized_reason is null then
    raise exception using errcode = '22023', message = 'A rejection reason is required';
  end if;

  if p_action = 'approve' then
    update public.listings
    set status = 'active',
        moderation_status = 'approved',
        rejection_reason = null,
        published_at = coalesce(published_at, timezone('utc', now()))
    where id = p_listing_id
      and status = 'pending'
      and moderation_status = 'pending'
    returning * into updated_listing;
  else
    update public.listings
    set status = 'rejected',
        moderation_status = 'rejected',
        rejection_reason = normalized_reason
    where id = p_listing_id
      and status = 'pending'
      and moderation_status = 'pending'
    returning * into updated_listing;
  end if;

  if updated_listing.id is null then
    raise exception using errcode = 'P0002', message = 'Pending listing was not found or was already reviewed';
  end if;

  insert into public.listing_moderation_events (listing_id, admin_id, action, rejection_reason)
  values (updated_listing.id, auth.uid(), p_action, normalized_reason);

  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (
    updated_listing.seller_id,
    auth.uid(),
    'listing_moderated',
    case when p_action = 'approve' then 'Your listing is now live' else 'Your listing needs changes' end,
    case when p_action = 'approve'
      then 'Your listing has passed review and is now visible on bese26.'
      else 'Review feedback: ' || normalized_reason
    end,
    jsonb_build_object('listing_id', updated_listing.id, 'action', p_action)
  );

  return updated_listing;
end;
$$;

revoke all on function public.moderate_listing(uuid, text, text) from public, anon;
grant execute on function public.moderate_listing(uuid, text, text) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260827202000_remove_unused_resubmit_rpc.sql
-- ================================================================

-- Bese26: remove the earlier narrow helper superseded by revise_rejected_listing.
drop function if exists public.resubmit_rejected_listing(uuid);


-- ================================================================
-- SOURCE: supabase/migrations/20260827210000_profile_preferences.sql
-- ================================================================

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


-- ================================================================
-- SOURCE: supabase/migrations/20260827210100_profile_account_type.sql
-- ================================================================

-- Store the user's marketplace account type in the existing profile source of truth.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

alter table public.profiles
  add column if not exists account_type text not null default 'Individual'
  check (account_type in ('Individual', 'Farmer', 'Seller', 'Business', 'Professional', 'Organization'));

grant update (account_type) on public.profiles to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260827211000_profile_account_workflows.sql
-- ================================================================

-- Real Profile account workflows for Bese26.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  query text not null default '',
  category text,
  location text,
  min_price numeric(14,2) check (min_price is null or min_price >= 0),
  max_price numeric(14,2) check (max_price is null or max_price >= 0),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  alerts_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (max_price is null or min_price is null or max_price >= min_price)
);

create table if not exists public.business_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text not null,
  logo_path text,
  category text,
  description text,
  phone text,
  email text,
  country text not null default 'Nigeria',
  state text,
  city text,
  address text,
  business_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(business_hours) = 'object'),
  website text,
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  registration_number text,
  is_verified boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'user', 'message', 'business', 'scam', 'prohibited_item', 'harassment', 'fake_information')),
  target_id uuid,
  reason text not null,
  description text check (description is null or char_length(description) <= 3000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.users_are_blocked(p_left uuid, p_right uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profile_blocks
    where (blocker_id = p_left and blocked_id = p_right)
       or (blocker_id = p_right and blocked_id = p_left)
  );
$$;
revoke all on function public.users_are_blocked(uuid, uuid) from public, anon;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;

create index if not exists profile_follows_following_idx on public.profile_follows (following_id, created_at desc);
create index if not exists saved_searches_user_idx on public.saved_searches (user_id, updated_at desc);
create index if not exists profile_blocks_blocker_idx on public.profile_blocks (blocker_id, created_at desc);
create index if not exists user_reports_reporter_idx on public.user_reports (reporter_id, created_at desc);

create trigger saved_searches_updated_at before update on public.saved_searches for each row execute procedure public.set_updated_at();
create trigger business_profiles_updated_at before update on public.business_profiles for each row execute procedure public.set_updated_at();
create trigger user_reports_updated_at before update on public.user_reports for each row execute procedure public.set_updated_at();

alter table public.profile_follows enable row level security;
alter table public.saved_searches enable row level security;
alter table public.business_profiles enable row level security;
alter table public.profile_blocks enable row level security;
alter table public.user_reports enable row level security;

drop policy if exists profile_follows_public_read on public.profile_follows;
create policy profile_follows_public_read on public.profile_follows for select to authenticated using (follower_id = auth.uid() or following_id = auth.uid());
drop policy if exists profile_follows_self_insert on public.profile_follows;
create policy profile_follows_self_insert on public.profile_follows for insert to authenticated with check (follower_id = auth.uid() and follower_id <> following_id);
drop policy if exists profile_follows_self_delete on public.profile_follows;
create policy profile_follows_self_delete on public.profile_follows for delete to authenticated using (follower_id = auth.uid());

drop policy if exists saved_searches_self_read on public.saved_searches;
create policy saved_searches_self_read on public.saved_searches for select to authenticated using (user_id = auth.uid());
drop policy if exists saved_searches_self_insert on public.saved_searches;
create policy saved_searches_self_insert on public.saved_searches for insert to authenticated with check (user_id = auth.uid());
drop policy if exists saved_searches_self_update on public.saved_searches;
create policy saved_searches_self_update on public.saved_searches for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists saved_searches_self_delete on public.saved_searches;
create policy saved_searches_self_delete on public.saved_searches for delete to authenticated using (user_id = auth.uid());

drop policy if exists business_profiles_public_read on public.business_profiles;
create policy business_profiles_public_read on public.business_profiles for select to anon, authenticated using (is_verified or profile_id = auth.uid());
drop policy if exists business_profiles_self_insert on public.business_profiles;
create policy business_profiles_self_insert on public.business_profiles for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists business_profiles_self_update on public.business_profiles;
create policy business_profiles_self_update on public.business_profiles for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists business_profiles_self_delete on public.business_profiles;
create policy business_profiles_self_delete on public.business_profiles for delete to authenticated using (profile_id = auth.uid());

drop policy if exists profile_blocks_self_read on public.profile_blocks;
create policy profile_blocks_self_read on public.profile_blocks for select to authenticated using (blocker_id = auth.uid());
drop policy if exists profile_blocks_self_insert on public.profile_blocks;
create policy profile_blocks_self_insert on public.profile_blocks for insert to authenticated with check (blocker_id = auth.uid() and blocker_id <> blocked_id);
drop policy if exists profile_blocks_self_delete on public.profile_blocks;
create policy profile_blocks_self_delete on public.profile_blocks for delete to authenticated using (blocker_id = auth.uid());

drop policy if exists user_reports_self_read on public.user_reports;
create policy user_reports_self_read on public.user_reports for select to authenticated using (reporter_id = auth.uid());
drop policy if exists user_reports_self_insert on public.user_reports;
create policy user_reports_self_insert on public.user_reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists user_reports_moderator_read on public.user_reports;
create policy user_reports_moderator_read on public.user_reports for select to authenticated using (private.is_moderator_or_admin());
drop policy if exists user_reports_moderator_update on public.user_reports;
create policy user_reports_moderator_update on public.user_reports for update to authenticated using (private.is_moderator_or_admin()) with check (private.is_moderator_or_admin());

grant select, insert, delete on public.profile_follows to authenticated;
grant select, insert, update, delete on public.saved_searches to authenticated;
grant select, insert, update, delete on public.business_profiles to authenticated;
grant select, insert, delete on public.profile_blocks to authenticated;
grant select, insert on public.user_reports to authenticated;

-- A block must stop new and existing conversations between the two users.
drop policy if exists conversations_participant_read on public.conversations;
create policy conversations_participant_read on public.conversations for select to authenticated using ((buyer_id = auth.uid() or seller_id = auth.uid()) and not public.users_are_blocked(buyer_id, seller_id));
drop policy if exists conversations_participant_insert on public.conversations;
create policy conversations_participant_insert on public.conversations for insert to authenticated with check ((buyer_id = auth.uid() or seller_id = auth.uid()) and not public.users_are_blocked(buyer_id, seller_id));


-- ================================================================
-- SOURCE: supabase/migrations/20260828090000_subscription_entitlements_and_free_posts.sql
-- ================================================================

-- Bese26 subscription entitlements and three-free-post allowance
-- Payment checkout is intentionally not included here. Subscription rows are written only by a future trusted payment workflow.

create table if not exists public.seller_subscriptions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  plan_key text not null default 'free' check (plan_key in ('free','basic','premium','business','vip','vip_gold','diamond_gold','diamond_elite','enterprise_gold','enterprise_elite')),
  status text not null default 'inactive' check (status in ('inactive','pending','active','paused','canceled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_post_usage (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  free_posts_used integer not null default 0 check (free_posts_used >= 0 and free_posts_used <= 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_subscriptions_status_idx on public.seller_subscriptions (status, current_period_end);

alter table public.seller_subscriptions enable row level security;
alter table public.seller_post_usage enable row level security;

drop policy if exists seller_subscriptions_owner_read on public.seller_subscriptions;
create policy seller_subscriptions_owner_read on public.seller_subscriptions
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists seller_post_usage_owner_read on public.seller_post_usage;
create policy seller_post_usage_owner_read on public.seller_post_usage
  for select to authenticated using (profile_id = auth.uid());

grant select on public.seller_subscriptions, public.seller_post_usage to authenticated;
revoke insert, update, delete on public.seller_subscriptions, public.seller_post_usage from anon, authenticated;
revoke insert on public.listings from anon, authenticated;

drop trigger if exists seller_subscriptions_updated_at on public.seller_subscriptions;
create trigger seller_subscriptions_updated_at before update on public.seller_subscriptions for each row execute procedure private.set_updated_at();

drop trigger if exists seller_post_usage_updated_at on public.seller_post_usage;
create trigger seller_post_usage_updated_at before update on public.seller_post_usage for each row execute procedure private.set_updated_at();

create or replace function public.get_seller_entitlement()
returns table (
  plan_key text,
  subscription_status text,
  is_paid boolean,
  free_posts_limit integer,
  free_posts_used integer,
  free_posts_remaining integer,
  listing_limit integer,
  current_period_end timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_used integer := 0;
  v_paid boolean := false;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select s.plan_key, s.status, s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s
   where s.profile_id = v_user;

  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';

  select u.free_posts_used into v_used
    from public.seller_post_usage u
   where u.profile_id = v_user;

  return query select
    v_plan,
    v_status,
    v_paid,
    3,
    coalesce(v_used, 0),
    greatest(3 - coalesce(v_used, 0), 0),
    case v_plan
      when 'basic' then 20
      when 'premium' then 60
      when 'business' then 250
      when 'vip' then 120
      when 'vip_gold' then 250
      when 'diamond_gold' then 500
      when 'diamond_elite' then 1000
      when 'enterprise_gold' then 2000
      when 'enterprise_elite' then 5000
      else 3
    end,
    v_end;
end;
$$;

revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;

create or replace function public.create_listing_with_plan(
  p_category_id uuid,
  p_subcategory_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_currency text,
  p_pricing_type text,
  p_condition text,
  p_quantity integer,
  p_unit text,
  p_country text,
  p_state text,
  p_city text,
  p_delivery_options text[],
  p_contact_preference text,
  p_attributes jsonb
)
returns setof public.listings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_paid boolean := false;
  v_used integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'TITLE_REQUIRED'; end if;
  if nullif(trim(p_description), '') is null then raise exception 'DESCRIPTION_REQUIRED'; end if;
  if p_price is null or p_price <= 0 then raise exception 'VALID_PRICE_REQUIRED'; end if;
  if nullif(trim(p_state), '') is null or nullif(trim(p_city), '') is null then raise exception 'LOCATION_REQUIRED'; end if;
  if not exists (select 1 from public.categories c where c.id = p_category_id and c.is_active) then raise exception 'CATEGORY_NOT_AVAILABLE'; end if;
  if p_subcategory_id is not null and not exists (select 1 from public.categories c where c.id = p_subcategory_id and c.parent_id = p_category_id and c.is_active) then raise exception 'SUBCATEGORY_NOT_AVAILABLE'; end if;

  select s.plan_key, s.status, s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s
   where s.profile_id = v_user
   for update;
  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';

  if not v_paid then
    insert into public.seller_post_usage (profile_id, free_posts_used)
    values (v_user, 1)
    on conflict (profile_id) do update
      set free_posts_used = public.seller_post_usage.free_posts_used + 1,
          updated_at = now()
      where public.seller_post_usage.free_posts_used < 3
    returning free_posts_used into v_used;
    if v_used is null then
      raise exception 'FREE_POST_LIMIT_REACHED';
    end if;
  end if;

  return query
  insert into public.listings (
    seller_id, category_id, subcategory_id, title, description, price, currency,
    pricing_type, condition, quantity, unit, country, state, city,
    delivery_options, contact_preference, attributes, status, moderation_status
  ) values (
    v_user, p_category_id, p_subcategory_id, trim(p_title), trim(p_description), p_price, coalesce(nullif(trim(p_currency), ''), 'NGN'),
    coalesce(nullif(trim(p_pricing_type), ''), 'fixed'), nullif(trim(p_condition), ''), p_quantity, nullif(trim(p_unit), ''),
    coalesce(nullif(trim(p_country), ''), 'Nigeria'), trim(p_state), trim(p_city), coalesce(p_delivery_options, '{}'::text[]),
    coalesce(nullif(trim(p_contact_preference), ''), 'chat'), coalesce(p_attributes, '{}'::jsonb), 'pending', 'pending'
  ) returning *;
end;
$$;

revoke all on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, text[], text, jsonb) from public, anon;
grant execute on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, text[], text, jsonb) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260828094000_paystack_payment_transactions.sql
-- ================================================================

-- Paystack payment ledger for Bese26 subscriptions.
-- Writes are server-only; authenticated users can read their own rows.

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_key text not null check (plan_key in ('premium', 'business')),
  reference text not null unique,
  amount_kobo integer not null check (amount_kobo > 0),
  currency text not null default 'NGN',
  provider text not null default 'paystack',
  status text not null default 'initialized' check (status in ('initialized', 'successful', 'failed', 'abandoned', 'reversed', 'refunded')),
  paystack_transaction_id bigint,
  provider_customer_id text,
  provider_subscription_id text,
  event_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_transactions_user_idx on public.payment_transactions (user_id, created_at desc);
create index if not exists payment_transactions_status_idx on public.payment_transactions (status, updated_at desc);

alter table public.payment_transactions enable row level security;

drop policy if exists payment_transactions_owner_read on public.payment_transactions;
create policy payment_transactions_owner_read on public.payment_transactions
  for select to authenticated using (user_id = auth.uid());

grant select on public.payment_transactions to authenticated;
revoke insert, update, delete on public.payment_transactions from anon, authenticated;

drop trigger if exists payment_transactions_updated_at on public.payment_transactions;
create trigger payment_transactions_updated_at before update on public.payment_transactions for each row execute procedure private.set_updated_at();


-- ================================================================
-- SOURCE: supabase/migrations/20260828101000_allow_basic_paystack_plan.sql
-- ================================================================

-- Allow the launch Basic plan in the Paystack payment ledger.
alter table public.payment_transactions drop constraint if exists payment_transactions_plan_key_check;
alter table public.payment_transactions add constraint payment_transactions_plan_key_check check (plan_key in ('basic', 'premium', 'business'));


-- ================================================================
-- SOURCE: supabase/migrations/20260828190000_account_deletion.sql
-- ================================================================

-- Allow an authenticated user to permanently delete only their own account.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260828192000_fix_listing_delivery_options_jsonb.sql
-- ================================================================

-- The original subscription migration declared p_delivery_options as text[],
-- while listings.delivery_options is jsonb. Replace that overload with jsonb.
drop function if exists public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, text[], text, jsonb);

create or replace function public.create_listing_with_plan(
  p_category_id uuid,
  p_subcategory_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_currency text,
  p_pricing_type text,
  p_condition text,
  p_quantity integer,
  p_unit text,
  p_country text,
  p_state text,
  p_city text,
  p_delivery_options jsonb,
  p_contact_preference text,
  p_attributes jsonb
)
returns setof public.listings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_paid boolean := false;
  v_used integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'TITLE_REQUIRED'; end if;
  if nullif(trim(p_description), '') is null then raise exception 'DESCRIPTION_REQUIRED'; end if;
  if p_price is null or p_price <= 0 then raise exception 'VALID_PRICE_REQUIRED'; end if;
  if nullif(trim(p_state), '') is null or nullif(trim(p_city), '') is null then raise exception 'LOCATION_REQUIRED'; end if;
  if not exists (select 1 from public.categories c where c.id = p_category_id and c.is_active) then raise exception 'CATEGORY_NOT_AVAILABLE'; end if;
  if p_subcategory_id is not null and not exists (select 1 from public.categories c where c.id = p_subcategory_id and c.parent_id = p_category_id and c.is_active) then raise exception 'SUBCATEGORY_NOT_AVAILABLE'; end if;

  select s.plan_key, s.status, s.current_period_end into v_plan, v_status, v_end
    from public.seller_subscriptions s where s.profile_id = v_user for update;
  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';

  if not v_paid then
    insert into public.seller_post_usage (profile_id, free_posts_used) values (v_user, 1)
    on conflict (profile_id) do update set free_posts_used = public.seller_post_usage.free_posts_used + 1, updated_at = now()
      where public.seller_post_usage.free_posts_used < 3
    returning free_posts_used into v_used;
    if v_used is null then raise exception 'FREE_POST_LIMIT_REACHED'; end if;
  end if;

  return query insert into public.listings (
    seller_id, category_id, subcategory_id, title, description, price, currency,
    pricing_type, condition, quantity, unit, country, state, city,
    delivery_options, contact_preference, attributes, status, moderation_status
  ) values (
    v_user, p_category_id, p_subcategory_id, trim(p_title), trim(p_description), p_price,
    coalesce(nullif(trim(p_currency), ''), 'NGN'), coalesce(nullif(trim(p_pricing_type), ''), 'fixed'),
    nullif(trim(p_condition), ''), p_quantity, nullif(trim(p_unit), ''), coalesce(nullif(trim(p_country), ''), 'Nigeria'),
    trim(p_state), trim(p_city), case when jsonb_typeof(coalesce(p_delivery_options, '[]'::jsonb)) = 'array' then p_delivery_options else '[]'::jsonb end,
    coalesce(nullif(trim(p_contact_preference), ''), 'chat'), coalesce(p_attributes, '{}'::jsonb), 'pending', 'pending'
  ) returning *;
end;
$$;

revoke all on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, jsonb, text, jsonb) from public, anon;
grant execute on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, jsonb, text, jsonb) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260828193000_compat_delivery_options_text_array.sql
-- ================================================================

-- Compatibility fix for databases where the original RPC still has text[]
-- while public.listings.delivery_options is jsonb.
create or replace function public.create_listing_with_plan(
  p_category_id uuid,
  p_subcategory_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_currency text,
  p_pricing_type text,
  p_condition text,
  p_quantity integer,
  p_unit text,
  p_country text,
  p_state text,
  p_city text,
  p_delivery_options text[],
  p_contact_preference text,
  p_attributes jsonb
)
returns setof public.listings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_paid boolean := false;
  v_used integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'TITLE_REQUIRED'; end if;
  if nullif(trim(p_description), '') is null then raise exception 'DESCRIPTION_REQUIRED'; end if;
  if p_price is null or p_price <= 0 then raise exception 'VALID_PRICE_REQUIRED'; end if;
  if nullif(trim(p_state), '') is null or nullif(trim(p_city), '') is null then raise exception 'LOCATION_REQUIRED'; end if;
  if not exists (select 1 from public.categories c where c.id = p_category_id and c.is_active) then raise exception 'CATEGORY_NOT_AVAILABLE'; end if;
  if p_subcategory_id is not null and not exists (select 1 from public.categories c where c.id = p_subcategory_id and c.parent_id = p_category_id and c.is_active) then raise exception 'SUBCATEGORY_NOT_AVAILABLE'; end if;

  select s.plan_key, s.status, s.current_period_end into v_plan, v_status, v_end
    from public.seller_subscriptions s where s.profile_id = v_user for update;
  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';

  if not v_paid then
    insert into public.seller_post_usage (profile_id, free_posts_used) values (v_user, 1)
    on conflict (profile_id) do update set free_posts_used = public.seller_post_usage.free_posts_used + 1, updated_at = now()
      where public.seller_post_usage.free_posts_used < 3
    returning free_posts_used into v_used;
    if v_used is null then raise exception 'FREE_POST_LIMIT_REACHED'; end if;
  end if;

  return query insert into public.listings (
    seller_id, category_id, subcategory_id, title, description, price, currency,
    pricing_type, condition, quantity, unit, country, state, city,
    delivery_options, contact_preference, attributes, status, moderation_status
  ) values (
    v_user, p_category_id, p_subcategory_id, trim(p_title), trim(p_description), p_price,
    coalesce(nullif(trim(p_currency), ''), 'NGN'), coalesce(nullif(trim(p_pricing_type), ''), 'fixed'),
    nullif(trim(p_condition), ''), p_quantity, nullif(trim(p_unit), ''), coalesce(nullif(trim(p_country), ''), 'Nigeria'),
    trim(p_state), trim(p_city), coalesce(to_jsonb(p_delivery_options), '[]'::jsonb),
    coalesce(nullif(trim(p_contact_preference), ''), 'chat'), coalesce(p_attributes, '{}'::jsonb), 'pending', 'pending'
  ) returning *;
end;
$$;

revoke all on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, text[], text, jsonb) from public, anon;
grant execute on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, text[], text, jsonb) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260829230000_remove_conflicting_delivery_rpc_overload.sql
-- ================================================================

-- Remove the legacy overload that accepted text[] delivery options.
-- The listings table stores delivery_options as jsonb, so only the jsonb RPC
-- should remain available to PostgREST/Supabase clients.
drop function if exists public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, text[], text, jsonb
);

-- Keep the intended jsonb signature explicit and restricted to signed-in sellers.
revoke all on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
) from public, anon;

grant execute on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260829232500_business_profile_production_fields.sql
-- ================================================================

-- Production business profile fields. Existing rows remain valid.
alter table public.business_profiles
  add column if not exists business_handle text,
  add column if not exists business_type text,
  add column if not exists whatsapp text,
  add column if not exists area text,
  add column if not exists delivery_available boolean not null default false,
  add column if not exists pickup_available boolean not null default true,
  add column if not exists years_in_business integer,
  add column if not exists is_active boolean not null default true,
  add column if not exists public_contact boolean not null default false,
  add column if not exists location_visibility text not null default 'city';

alter table public.business_profiles
  drop constraint if exists business_profiles_handle_format;
alter table public.business_profiles
  add constraint business_profiles_handle_format check (
    business_handle is null or business_handle ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$'
  );
alter table public.business_profiles
  drop constraint if exists business_profiles_years_check;
alter table public.business_profiles
  add constraint business_profiles_years_check check (years_in_business is null or years_in_business between 0 and 200);
alter table public.business_profiles
  drop constraint if exists business_profiles_location_visibility_check;
alter table public.business_profiles
  add constraint business_profiles_location_visibility_check check (location_visibility in ('city', 'approximate', 'exact'));
create unique index if not exists business_profiles_handle_unique
  on public.business_profiles (lower(business_handle))
  where business_handle is not null and is_active;
create index if not exists business_profiles_active_idx
  on public.business_profiles (is_active, is_verified);


-- ================================================================
-- SOURCE: supabase/migrations/20260830083000_harden_function_privileges.sql
-- ================================================================

-- Harden privileges discovered during the Bese26 production security review.
-- Account deletion is an authenticated self-service action only.
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Keep the legacy trigger function safe for the profile-preferences triggers
-- that still reference it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260830110500_recently_viewed.sql
-- ================================================================

create table if not exists public.recently_viewed (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  viewed_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, listing_id)
);
create index if not exists recently_viewed_user_idx on public.recently_viewed (user_id, viewed_at desc);
alter table public.recently_viewed enable row level security;
drop policy if exists recently_viewed_self on public.recently_viewed;
create policy recently_viewed_self on public.recently_viewed for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.recently_viewed to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260830143000_verification_workflow.sql
-- ================================================================

create table if not exists public.verification_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  verification_type text not null check (verification_type in ('seller','business','identity')),
  full_name text not null,
  phone text,
  business_name text,
  business_handle text,
  document_path text,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','action_required')),
  reviewer_note text,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists verification_applications_status_idx on public.verification_applications(status, created_at desc);
create index if not exists verification_applications_user_idx on public.verification_applications(user_id, created_at desc);
alter table public.verification_applications enable row level security;
drop policy if exists verification_self_read on public.verification_applications;
create policy verification_self_read on public.verification_applications for select to authenticated using (user_id = auth.uid() or public.current_user_can_moderate());
drop policy if exists verification_self_insert on public.verification_applications;
create policy verification_self_insert on public.verification_applications for insert to authenticated with check (user_id = auth.uid());
drop policy if exists verification_admin_update on public.verification_applications;
create policy verification_admin_update on public.verification_applications for update to authenticated using (public.current_user_can_moderate()) with check (public.current_user_can_moderate());
grant select, insert on public.verification_applications to authenticated;
grant update on public.verification_applications to authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('verification-documents', 'verification-documents', false, 8000000, array['image/jpeg','image/png','image/webp','application/pdf']) on conflict (id) do nothing;
drop policy if exists verification_docs_insert on storage.objects;
create policy verification_docs_insert on storage.objects for insert to authenticated with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists verification_docs_select on storage.objects;
create policy verification_docs_select on storage.objects for select to authenticated using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists verification_docs_admin_select on storage.objects;
create policy verification_docs_admin_select on storage.objects for select to authenticated using (bucket_id = 'verification-documents' and public.current_user_can_moderate());


-- ================================================================
-- SOURCE: supabase/migrations/20260830170000_verification_monthly_pricing.sql
-- ================================================================

-- Verification pricing: one simple monthly fee for personal/seller and business review.
-- The monthly fee is fixed server-side at NGN 3,500 (350,000 kobo).
alter table public.verification_applications
  add column if not exists duration_months integer not null default 1;

alter table public.verification_applications
  drop constraint if exists verification_duration_months_check;

alter table public.verification_applications
  add constraint verification_duration_months_check check (duration_months between 1 and 12);

alter table public.verification_applications
  add column if not exists monthly_fee_kobo integer generated always as (350000) stored;

alter table public.verification_applications
  add column if not exists expires_at timestamptz;

alter table public.profiles
  add column if not exists verification_expires_at timestamptz;

alter table public.business_profiles
  add column if not exists verification_expires_at timestamptz;

alter table public.verification_applications
  add column if not exists total_fee_kobo integer generated always as (350000 * duration_months) stored;

comment on column public.verification_applications.duration_months is 'Requested verification duration in whole months, from 1 to 12.';
comment on column public.verification_applications.monthly_fee_kobo is 'Fixed monthly verification fee: NGN 3,500, stored in kobo.';
comment on column public.verification_applications.total_fee_kobo is 'Server-calculated total verification fee: monthly fee multiplied by duration_months.';
comment on column public.verification_applications.expires_at is 'Verification validity end date, set when an application is approved.';
comment on column public.profiles.verification_expires_at is 'Personal/seller verification validity end date.';
comment on column public.business_profiles.verification_expires_at is 'Business verification validity end date.';


-- ================================================================
-- SOURCE: supabase/migrations/20260830180000_boosting_and_support.sql
-- ================================================================

-- Bese26 Boosting and Contact Support foundation.
-- Boost activation is server-authoritative; support tickets are user-owned with staff moderation access.

create table if not exists public.boost_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_days integer not null check (duration_days > 0),
  price_kobo integer not null check (price_kobo > 0),
  placement text not null default 'featured' check (placement in ('featured', 'top_search', 'homepage')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_boosts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.boost_packages(id),
  payment_reference text unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'cancelled', 'failed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_boosts_listing_idx on public.listing_boosts (listing_id, status, ends_at desc);
create index if not exists listing_boosts_seller_idx on public.listing_boosts (seller_id, created_at desc);
create index if not exists listing_boosts_active_idx on public.listing_boosts (status, starts_at, ends_at);

alter table public.payment_transactions drop constraint if exists payment_transactions_plan_key_check;
alter table public.payment_transactions add constraint payment_transactions_plan_key_check check (plan_key in ('premium', 'business', 'boost'));
alter table public.payment_transactions add column if not exists purpose text not null default 'subscription' check (purpose in ('subscription', 'boost'));
alter table public.payment_transactions add column if not exists listing_boost_id uuid references public.listing_boosts(id) on delete set null;
create index if not exists payment_transactions_boost_idx on public.payment_transactions (listing_boost_id) where listing_boost_id is not null;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  subject text not null check (char_length(subject) between 3 and 160),
  category text not null default 'general' check (category in ('general', 'account', 'listing', 'payment', 'safety', 'verification', 'technical')),
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  is_staff boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status, priority, updated_at desc);
create index if not exists support_replies_ticket_idx on public.support_replies (ticket_id, created_at);

alter table public.boost_packages enable row level security;
alter table public.listing_boosts enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_replies enable row level security;

insert into public.boost_packages (name, duration_days, price_kobo, placement)
values
  ('Featured · 3 days', 3, 100000, 'featured'),
  ('Featured · 7 days', 7, 200000, 'featured'),
  ('Top search · 7 days', 7, 350000, 'top_search')
on conflict do nothing;

 drop policy if exists boost_packages_public_read on public.boost_packages;
create policy boost_packages_public_read on public.boost_packages for select to anon, authenticated using (is_active = true);
grant select on public.boost_packages to anon, authenticated;
revoke insert, update, delete on public.boost_packages from anon, authenticated;

 drop policy if exists listing_boosts_owner_read on public.listing_boosts;
create policy listing_boosts_owner_read on public.listing_boosts for select to authenticated using (seller_id = auth.uid());
grant select on public.listing_boosts to authenticated;
revoke insert, update, delete on public.listing_boosts from anon, authenticated;

 drop policy if exists support_tickets_owner_read on public.support_tickets;
create policy support_tickets_owner_read on public.support_tickets for select to authenticated using (user_id = auth.uid());
drop policy if exists support_tickets_owner_insert on public.support_tickets;
create policy support_tickets_owner_insert on public.support_tickets for insert to authenticated with check (user_id = auth.uid());
grant select, insert on public.support_tickets to authenticated;
revoke update, delete on public.support_tickets from anon, authenticated;

 drop policy if exists support_replies_participant_read on public.support_replies;
create policy support_replies_participant_read on public.support_replies for select to authenticated using (
  exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.app_role in ('admin', 'moderator'))
);
grant select on public.support_replies to authenticated;
revoke insert, update, delete on public.support_replies from anon, authenticated;

 drop trigger if exists listing_boosts_updated_at on public.listing_boosts;
create trigger listing_boosts_updated_at before update on public.listing_boosts for each row execute procedure private.set_updated_at();
drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at before update on public.support_tickets for each row execute procedure private.set_updated_at();

comment on table public.boost_packages is 'Public active packages for paid listing promotion.';
comment on table public.listing_boosts is 'Server-authoritative paid promotion periods for seller listings.';
comment on table public.support_tickets is 'Authenticated user support requests and moderation workflow.';
comment on table public.support_replies is 'Staff replies to support tickets; writes are server-only.';

-- Keep the public listing query honest: only active boosts can be used by server ranking logic.
create or replace view public.active_listing_boosts as
select listing_id, seller_id, package_id, starts_at, ends_at, status
from public.listing_boosts
where status = 'active' and starts_at <= now() and ends_at > now();

grant select on public.active_listing_boosts to anon, authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260831120000_launch_monetization_limits.sql
-- ================================================================

-- Bese26 launch monetization limits.
-- Active listings, not lifetime posts, are the source of truth for publishing capacity.

create or replace function public.get_seller_entitlement()
returns table (
  plan_key text,
  subscription_status text,
  is_paid boolean,
  free_posts_limit integer,
  free_posts_used integer,
  free_posts_remaining integer,
  listing_limit integer,
  current_period_end timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_active_count integer := 0;
  v_paid boolean := false;
  v_limit integer := 3;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select s.plan_key, s.status, s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s
   where s.profile_id = v_user;

  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';
  v_limit := case v_plan
    when 'basic' then 15
    when 'premium' then 50
    when 'business' then 250
    when 'vip' then 120
    when 'vip_gold' then 250
    when 'diamond_gold' then 500
    when 'diamond_elite' then 1000
    when 'enterprise_gold' then 2000
    when 'enterprise_elite' then 5000
    else 3
  end;

  select count(*)::integer into v_active_count
    from public.listings l
   where l.seller_id = v_user
     and l.status = 'active';

  return query select
    coalesce(v_plan, 'free'),
    coalesce(v_status, 'inactive'),
    v_paid,
    3,
    v_active_count,
    greatest(v_limit - v_active_count, 0),
    v_limit,
    v_end;
end;
$$;

create or replace function public.create_listing_with_plan(
  p_category_id uuid,
  p_subcategory_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_currency text,
  p_pricing_type text,
  p_condition text,
  p_quantity integer,
  p_unit text,
  p_country text,
  p_state text,
  p_city text,
  p_delivery_options text[],
  p_contact_preference text,
  p_attributes jsonb
)
returns setof public.listings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_paid boolean := false;
  v_limit integer := 3;
  v_active_count integer := 0;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'TITLE_REQUIRED'; end if;
  if nullif(trim(p_description), '') is null then raise exception 'DESCRIPTION_REQUIRED'; end if;
  if p_price is null or p_price <= 0 then raise exception 'VALID_PRICE_REQUIRED'; end if;
  if nullif(trim(p_state), '') is null or nullif(trim(p_city), '') is null then raise exception 'LOCATION_REQUIRED'; end if;
  if not exists (select 1 from public.categories c where c.id = p_category_id and c.is_active) then raise exception 'CATEGORY_NOT_AVAILABLE'; end if;
  if p_subcategory_id is not null and not exists (select 1 from public.categories c where c.id = p_subcategory_id and c.parent_id = p_category_id and c.is_active) then raise exception 'SUBCATEGORY_NOT_AVAILABLE'; end if;

  select s.plan_key, s.status, s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s
   where s.profile_id = v_user
   for update;

  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';
  v_limit := case when v_paid then case v_plan when 'basic' then 15 when 'premium' then 50 when 'business' then 250 else 3 end else 3 end;

  select count(*)::integer into v_active_count
    from public.listings l
   where l.seller_id = v_user
     and l.status = 'active';

  if v_active_count >= v_limit then
    raise exception 'ACTIVE_LISTING_LIMIT_REACHED';
  end if;

  return query
  insert into public.listings (
    seller_id, category_id, subcategory_id, title, description, price, currency,
    pricing_type, condition, quantity, unit, country, state, city,
    delivery_options, contact_preference, attributes, status, moderation_status
  ) values (
    v_user, p_category_id, p_subcategory_id, trim(p_title), trim(p_description), p_price,
    coalesce(nullif(trim(p_currency), ''), 'NGN'), coalesce(nullif(trim(p_pricing_type), ''), 'fixed'),
    nullif(trim(p_condition), ''), p_quantity, nullif(trim(p_unit), ''), coalesce(nullif(trim(p_country), ''), 'Nigeria'),
    trim(p_state), trim(p_city), coalesce(to_jsonb(p_delivery_options), '[]'::jsonb),
    coalesce(nullif(trim(p_contact_preference), ''), 'chat'), coalesce(p_attributes, '{}'::jsonb), 'pending', 'pending'
  ) returning *;
end;
$$;

revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;
revoke all on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, text[], text, jsonb) from public, anon;
grant execute on function public.create_listing_with_plan(uuid, uuid, text, text, numeric, text, text, text, integer, text, text, text, text, text[], text, jsonb) to authenticated;

comment on table public.seller_post_usage is 'Legacy compatibility table; active listing counts now enforce posting limits.';

-- Keep all non-financial client messages truthful.
-- No wallet balance or commission is introduced by this migration.

alter table public.payment_transactions drop constraint if exists payment_transactions_plan_key_check;
alter table public.payment_transactions add constraint payment_transactions_plan_key_check check (plan_key in ('basic', 'premium', 'business', 'boost'));


-- ================================================================
-- SOURCE: supabase/migrations/20260831170000_harden_active_boost_view.sql
-- ================================================================

-- Ensure the public boost view respects the querying user's RLS policies.
alter view public.active_listing_boosts set (security_invoker = true);


-- ================================================================
-- SOURCE: supabase/migrations/20260902095500_assign_first_admin.sql
-- ================================================================

-- Assign the first Bese26 owner/admin by the verified auth email.
-- This is intentionally idempotent and does not expose credentials.
update public.profiles as p
set app_role = 'admin'
from auth.users as u
where p.id = u.id
  and lower(u.email) = 'smbabanbaba@gmail.com';


-- ================================================================
-- SOURCE: supabase/migrations/20260902113000_remove_listing_rpc_overload_again.sql
-- ================================================================

-- Final compatibility cleanup: launch_monetization_limits recreated the legacy
-- text[] overload after the earlier removal migration. Keep only the jsonb RPC,
-- which matches public.listings.delivery_options and the current frontend payload.
drop function if exists public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, text[], text, jsonb
);

revoke all on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
) from public, anon;

grant execute on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
) to authenticated;

comment on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
) is 'Creates a listing with JSON delivery options; authenticated sellers only.';



-- ================================================================
-- SOURCE: supabase/migrations/20260902150000_callback_and_reports.sql
-- ================================================================

-- Real buyer callback requests and listing abuse reports.
-- These records never expose seller contact details; they create auditable in-app workflows.

create table if not exists public.listing_callback_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  message text check (message is null or char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'contacted', 'completed', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (requester_id <> seller_id)
);

create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('scam', 'prohibited_item', 'fake_information', 'harassment', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists listing_callback_requests_seller_idx on public.listing_callback_requests (seller_id, status, created_at desc);
create index if not exists listing_callback_requests_requester_idx on public.listing_callback_requests (requester_id, created_at desc);
create index if not exists listing_reports_status_idx on public.listing_reports (status, created_at desc);

alter table public.listing_callback_requests enable row level security;
alter table public.listing_reports enable row level security;

drop policy if exists callback_request_insert_own on public.listing_callback_requests;
create policy callback_request_insert_own on public.listing_callback_requests
  for insert to authenticated
  with check (requester_id = auth.uid() and requester_id <> seller_id);

drop policy if exists callback_request_select_participant on public.listing_callback_requests;
create policy callback_request_select_participant on public.listing_callback_requests
  for select to authenticated
  using (requester_id = auth.uid() or seller_id = auth.uid() or public.current_user_can_moderate());

drop policy if exists callback_request_update_participant on public.listing_callback_requests;
create policy callback_request_update_participant on public.listing_callback_requests
  for update to authenticated
  using (seller_id = auth.uid() or requester_id = auth.uid() or public.current_user_can_moderate())
  with check (seller_id = auth.uid() or requester_id = auth.uid() or public.current_user_can_moderate());

drop policy if exists listing_report_insert_own on public.listing_reports;
create policy listing_report_insert_own on public.listing_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists listing_report_select_own_or_moderator on public.listing_reports;
create policy listing_report_select_own_or_moderator on public.listing_reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.current_user_can_moderate());

drop policy if exists listing_report_update_moderator on public.listing_reports;
create policy listing_report_update_moderator on public.listing_reports
  for update to authenticated
  using (public.current_user_can_moderate())
  with check (public.current_user_can_moderate());

create trigger listing_callback_requests_updated_at before update on public.listing_callback_requests for each row execute procedure public.set_updated_at();
create trigger listing_reports_updated_at before update on public.listing_reports for each row execute procedure public.set_updated_at();


-- ================================================================
-- SOURCE: supabase/migrations/20260902235500_public_active_business_profiles.sql
-- ================================================================

-- Public business pages are discoverable after a business profile is created.
-- Verification controls the badge and trust label; it does not hide an active company page.
drop policy if exists business_profiles_public_read on public.business_profiles;
create policy business_profiles_public_read
  on public.business_profiles
  for select
  to anon, authenticated
  using (is_active = true or profile_id = auth.uid());

-- Keep the directory and public-page lookup fast.
create index if not exists business_profiles_directory_active_idx
  on public.business_profiles (is_active, business_name);


-- ================================================================
-- SOURCE: supabase/migrations/20260903010000_business_verification_kinds.sql
-- ================================================================

-- Business verification is separate from personal profile verification.
alter table public.verification_applications
  add column if not exists business_registration_type text;

alter table public.verification_applications
  drop constraint if exists verification_applications_business_registration_type_check;
alter table public.verification_applications
  add constraint verification_applications_business_registration_type_check
  check (business_registration_type is null or business_registration_type in ('registered', 'unregistered'));

alter table public.business_profiles
  add column if not exists verification_kind text;

alter table public.business_profiles
  drop constraint if exists business_profiles_verification_kind_check;
alter table public.business_profiles
  add constraint business_profiles_verification_kind_check
  check (verification_kind is null or verification_kind in ('registered', 'unregistered'));

create index if not exists verification_applications_business_kind_idx
  on public.verification_applications (verification_type, business_registration_type, status);


-- ================================================================
-- SOURCE: supabase/migrations/20260903011500_verification_business_details.sql
-- ================================================================

alter table public.verification_applications
  add column if not exists registration_number text,
  add column if not exists business_address text,
  add column if not exists personal_business_name text,
  add column if not exists business_explanation text;

create index if not exists verification_applications_registration_type_idx
  on public.verification_applications (business_registration_type, status);


-- ================================================================
-- SOURCE: supabase/migrations/20260903210000_business_listing_ownership.sql
-- ================================================================

-- Persistent business publishing foundation.
-- Keeps personal ownership in seller_id while allowing a listing to be published as
-- the owner's business profile. Existing listings remain personal listings.
alter table public.listings
  add column if not exists business_profile_id uuid references public.business_profiles(profile_id) on delete set null,
  add column if not exists published_as_type text not null default 'personal';

alter table public.listings
drop constraint if exists listings_published_as_type_check;
alter table public.listings
add constraint listings_published_as_type_check
check (published_as_type in ('personal', 'business'));

create index if not exists listings_business_profile_idx
  on public.listings (business_profile_id, status, moderation_status, created_at desc);

-- Replace the existing JSONB RPC so the business reference is written atomically
-- and cannot be spoofed by a different user.
drop function if exists public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
);

create or replace function public.create_listing_with_plan(
  p_category_id uuid,
  p_subcategory_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_currency text,
  p_pricing_type text,
  p_condition text,
  p_quantity integer,
  p_unit text,
  p_country text,
  p_state text,
  p_city text,
  p_delivery_options jsonb,
  p_contact_preference text,
  p_attributes jsonb,
  p_business_profile_id uuid default null,
  p_published_as_type text default 'personal'
)
returns setof public.listings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_paid boolean := false;
  v_used integer;
  v_business_id uuid := null;
  v_publish_type text := coalesce(nullif(trim(p_published_as_type), ''), 'personal');
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'TITLE_REQUIRED'; end if;
  if nullif(trim(p_description), '') is null then raise exception 'DESCRIPTION_REQUIRED'; end if;
  if p_price is null or p_price <= 0 then raise exception 'VALID_PRICE_REQUIRED'; end if;
  if nullif(trim(p_state), '') is null or nullif(trim(p_city), '') is null then raise exception 'LOCATION_REQUIRED'; end if;
  if v_publish_type not in ('personal', 'business') then raise exception 'INVALID_PUBLISH_IDENTITY'; end if;
  if v_publish_type = 'business' then
    if p_business_profile_id is null then raise exception 'BUSINESS_REQUIRED'; end if;
    select bp.profile_id into v_business_id
    from public.business_profiles bp
    where bp.profile_id = p_business_profile_id
      and bp.profile_id = v_user
      and bp.is_active = true;
    if v_business_id is null then raise exception 'BUSINESS_NOT_OWNED'; end if;
  end if;
  if not exists (select 1 from public.categories c where c.id = p_category_id and c.is_active) then raise exception 'CATEGORY_NOT_AVAILABLE'; end if;
  if p_subcategory_id is not null and not exists (select 1 from public.categories c where c.id = p_subcategory_id and c.parent_id = p_category_id and c.is_active) then raise exception 'SUBCATEGORY_NOT_AVAILABLE'; end if;
  select s.plan_key, s.status, s.current_period_end into v_plan, v_status, v_end
    from public.seller_subscriptions s where s.profile_id = v_user for update;
  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';
  if not v_paid then
    insert into public.seller_post_usage (profile_id, free_posts_used) values (v_user, 1)
    on conflict (profile_id) do update set free_posts_used = public.seller_post_usage.free_posts_used + 1, updated_at = now()
      where public.seller_post_usage.free_posts_used < 3
    returning free_posts_used into v_used;
    if v_used is null then raise exception 'FREE_POST_LIMIT_REACHED'; end if;
  end if;
  return query insert into public.listings (
    seller_id, business_profile_id, published_as_type, category_id, subcategory_id,
    title, description, price, currency, pricing_type, condition, quantity, unit,
    country, state, city, delivery_options, contact_preference, attributes,
    status, moderation_status
  ) values (
    v_user, v_business_id, v_publish_type, p_category_id, p_subcategory_id,
    trim(p_title), trim(p_description), p_price,
    coalesce(nullif(trim(p_currency), ''), 'NGN'), coalesce(nullif(trim(p_pricing_type), ''), 'fixed'),
    nullif(trim(p_condition), ''), p_quantity, nullif(trim(p_unit), ''),
    coalesce(nullif(trim(p_country), ''), 'Nigeria'), trim(p_state), trim(p_city),
    case when jsonb_typeof(coalesce(p_delivery_options, '[]'::jsonb)) = 'array' then p_delivery_options else '[]'::jsonb end,
    coalesce(nullif(trim(p_contact_preference), ''), 'chat'), coalesce(p_attributes, '{}'::jsonb),
    'pending', 'pending'
  ) returning *;
end;
$$;

revoke all on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb, uuid, text
) from public, anon;
grant execute on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb, uuid, text
) to authenticated;

comment on column public.listings.business_profile_id is 'Optional owner business profile used for public publishing identity.';
comment on column public.listings.published_as_type is 'Public publishing identity: personal or business.';


-- ================================================================
-- SOURCE: supabase/migrations/20260903213000_listing_view_events.sql
-- ================================================================

-- Real listing view events for detail-page analytics.
create table if not exists public.listing_views (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  viewed_at timestamptz not null default timezone('utc', now())
);

create index if not exists listing_views_listing_time_idx
  on public.listing_views (listing_id, viewed_at desc);

alter table public.listing_views enable row level security;

drop policy if exists listing_views_owner_read on public.listing_views;
create policy listing_views_owner_read on public.listing_views
  for select to authenticated
  using (exists (
    select 1 from public.listings l
    where l.id = listing_views.listing_id and l.seller_id = auth.uid()
  ));

grant select on public.listing_views to authenticated;

create or replace function public.record_listing_view(p_listing_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
  v_viewer uuid := auth.uid();
begin
  if not exists (
    select 1 from public.listings
    where id = p_listing_id
      and status in ('active', 'pending', 'paused', 'sold')
  ) then
    return 0;
  end if;

  insert into public.listing_views (listing_id, viewer_id)
  values (p_listing_id, v_viewer);

  update public.listings
  set views_count = views_count + 1,
      updated_at = updated_at
  where id = p_listing_id
  returning views_count into v_count;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.record_listing_view(uuid) from public, anon;
grant execute on function public.record_listing_view(uuid) to anon, authenticated;
comment on function public.record_listing_view(uuid) is 'Records a public listing view and returns the persisted total.';


-- ================================================================
-- SOURCE: supabase/migrations/20260904172000_identity_verification_flow.sql
-- ================================================================

-- Bese26 identity verification / KYC workflow.
-- Reuses verification_applications; identity-specific fields are additive.

alter table public.verification_applications
  drop constraint if exists verification_applications_status_check;
alter table public.verification_applications
  add constraint verification_applications_status_check
  check (status in ('draft','pending','pending_review','under_review','approved','verified','rejected','action_required','requires_more_information'));

alter table public.verification_applications
  add column if not exists legal_first_name text,
  add column if not exists legal_middle_name text,
  add column if not exists legal_last_name text,
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists country text,
  add column if not exists state text,
  add column if not exists city text,
  add column if not exists residential_address text,
  add column if not exists document_type text,
  add column if not exists document_number_reference text,
  add column if not exists document_country text,
  add column if not exists document_expiry date,
  add column if not exists document_front_path text,
  add column if not exists document_back_path text,
  add column if not exists selfie_path text,
  add column if not exists provider text not null default 'manual_review',
  add column if not exists provider_reference text,
  add column if not exists provider_status text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists accuracy_confirmed boolean not null default false,
  add column if not exists liveness_status text not null default 'not_configured';

create index if not exists verification_identity_status_idx
  on public.verification_applications(verification_type, status, created_at desc);
create unique index if not exists one_open_identity_verification_per_user
  on public.verification_applications(user_id)
  where verification_type = 'identity' and status in ('draft','pending','pending_review','under_review','requires_more_information');

-- Users may save/update only their own non-final identity draft. They cannot
-- approve themselves, set provider results, or change a final decision.
drop policy if exists verification_identity_self_update on public.verification_applications;
create policy verification_identity_self_update on public.verification_applications
  for update to authenticated
  using (
    user_id = auth.uid()
    and verification_type = 'identity'
    and status in ('draft','rejected','requires_more_information')
  )
  with check (
    user_id = auth.uid()
    and verification_type = 'identity'
    and status in ('draft','requires_more_information')
  );

-- The RPC is the only browser-callable path that submits an identity request.
create or replace function public.submit_identity_verification(p_application_id uuid)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row public.verification_applications;
begin
  select * into v_row
  from public.verification_applications
  where id = p_application_id
    and user_id = auth.uid()
    and verification_type = 'identity'
  for update;
  if v_row.id is null then raise exception 'IDENTITY_APPLICATION_NOT_FOUND'; end if;
  if v_row.status not in ('draft','requires_more_information') then raise exception 'IDENTITY_APPLICATION_NOT_EDITABLE'; end if;
  if not v_row.accuracy_confirmed then raise exception 'ACCURACY_CONFIRMATION_REQUIRED'; end if;
  if v_row.legal_first_name is null or v_row.legal_last_name is null or v_row.date_of_birth is null
     or v_row.country is null or v_row.state is null or v_row.city is null or v_row.residential_address is null
     or v_row.document_type is null or v_row.document_number_reference is null or v_row.document_front_path is null
  then raise exception 'IDENTITY_APPLICATION_INCOMPLETE'; end if;
  update public.verification_applications
  set status = 'pending_review', submitted_at = timezone('utc', now()), updated_at = timezone('utc', now())
  where id = v_row.id
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.submit_identity_verification(uuid) from public, anon;
grant execute on function public.submit_identity_verification(uuid) to authenticated;

create or replace function public.review_identity_verification(p_application_id uuid, p_status text, p_reviewer_note text default null)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row public.verification_applications;
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information') then raise exception 'INVALID_IDENTITY_REVIEW_STATUS'; end if;
  update public.verification_applications
  set status = p_status,
      reviewer_note = nullif(trim(p_reviewer_note), ''),
      reviewed_by = auth.uid(),
      reviewed_at = timezone('utc', now()),
      verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
      updated_at = timezone('utc', now())
  where id = p_application_id and verification_type = 'identity'
  returning * into v_row;
  if v_row.id is null then raise exception 'IDENTITY_APPLICATION_NOT_FOUND'; end if;
  if p_status = 'verified' then
    update public.profiles set is_verified = true, updated_at = timezone('utc', now()) where id = v_row.user_id;
  end if;
  return v_row;
end;
$$;
revoke all on function public.review_identity_verification(uuid, text, text) from public, anon;
grant execute on function public.review_identity_verification(uuid, text, text) to authenticated;

drop policy if exists verification_docs_update on storage.objects;
create policy verification_docs_update on storage.objects for update to authenticated
  using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists verification_docs_delete on storage.objects;
create policy verification_docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Admin-only result changes remain separate from user draft editing.
comment on table public.verification_applications is 'Seller, business, and identity verification requests. Identity approval is controlled by moderation or a trusted provider webhook.';


-- ================================================================
-- SOURCE: supabase/migrations/20260904193000_business_listing_team_permissions.sql
-- ================================================================

-- Secure business listing team permissions.
-- The owner remains the source of truth; members receive explicit, auditable roles.
create table if not exists public.business_team_members (
  id uuid primary key default gen_random_uuid(),
  business_profile_id uuid not null references public.business_profiles(profile_id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','seller','staff','marketing')),
  assigned_listing_ids uuid[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_profile_id, user_id)
);
create index if not exists business_team_members_user_idx on public.business_team_members(user_id, is_active);
create index if not exists business_team_members_business_idx on public.business_team_members(business_profile_id, is_active);
alter table public.business_team_members enable row level security;

create or replace function public.user_business_listing_role(p_business_profile_id uuid, p_listing_id uuid default null)
returns text language sql stable security definer set search_path = public
as $$
  select case
    when bp.profile_id = auth.uid() then 'owner'
    else (
      select m.role from public.business_team_members m
      where m.business_profile_id = p_business_profile_id
        and m.user_id = auth.uid()
        and m.is_active
        and (m.role in ('admin','marketing','staff') or p_listing_id is null or cardinality(m.assigned_listing_ids) = 0 or p_listing_id = any(m.assigned_listing_ids))
      limit 1
    )
  end
  from public.business_profiles bp
  where bp.profile_id = p_business_profile_id;
$$;
revoke all on function public.user_business_listing_role(uuid, uuid) from public;
grant execute on function public.user_business_listing_role(uuid, uuid) to authenticated;

create policy business_team_members_self_or_owner_read on public.business_team_members
  for select to authenticated using (user_id = auth.uid() or business_profile_id = auth.uid());
create policy business_team_members_owner_manage on public.business_team_members
  for all to authenticated using (business_profile_id = auth.uid()) with check (business_profile_id = auth.uid());
grant select on public.business_team_members to authenticated;
grant insert, update, delete on public.business_team_members to authenticated;

-- Replace seller-only mutation policies with owner-or-authorized-business policies.
drop policy if exists listings_public_or_owner_read on public.listings;
create policy listings_public_or_owner_read on public.listings for select to anon, authenticated
using ((status = 'active' and moderation_status = 'approved') or seller_id = auth.uid() or public.user_business_listing_role(business_profile_id, id) is not null);
drop policy if exists listings_owner_update on public.listings;
create policy listings_owner_update on public.listings for update to authenticated
using (seller_id = auth.uid() or public.user_business_listing_role(business_profile_id, id) in ('owner','admin','manager','seller'))
with check (seller_id = auth.uid() or public.user_business_listing_role(business_profile_id, id) in ('owner','admin','manager','seller'));
drop policy if exists listings_owner_delete on public.listings;
create policy listings_owner_delete on public.listings for delete to authenticated
using (seller_id = auth.uid() or public.user_business_listing_role(business_profile_id, id) in ('owner','admin'));
drop policy if exists listing_media_owner_insert on public.listing_media;
create policy listing_media_owner_insert on public.listing_media for insert to authenticated
with check (owner_id = auth.uid() and exists (select 1 from public.listings l where l.id = listing_id and (l.seller_id = auth.uid() or public.user_business_listing_role(l.business_profile_id, l.id) in ('owner','admin','manager','seller'))));
drop policy if exists listing_media_owner_delete on public.listing_media;
create policy listing_media_owner_delete on public.listing_media for delete to authenticated
using (owner_id = auth.uid() or exists (select 1 from public.listings l where l.id = listing_id and public.user_business_listing_role(l.business_profile_id, l.id) in ('owner','admin','manager','seller')));
drop policy if exists listing_media_owner_update on public.listing_media;
create policy listing_media_owner_update on public.listing_media for update to authenticated
using (owner_id = auth.uid() or exists (select 1 from public.listings l where l.id = listing_id and public.user_business_listing_role(l.business_profile_id, l.id) in ('owner','admin','manager','seller')))
with check (owner_id = auth.uid() or exists (select 1 from public.listings l where l.id = listing_id and public.user_business_listing_role(l.business_profile_id, l.id) in ('owner','admin','manager','seller')));
drop policy if exists listing_media_public_or_owner_read on public.listing_media;
create policy listing_media_public_or_owner_read on public.listing_media for select to anon, authenticated
using (exists (select 1 from public.listings l where l.id = listing_id and ((l.status = 'active' and l.moderation_status = 'approved') or l.seller_id = auth.uid() or public.user_business_listing_role(l.business_profile_id, l.id) is not null)));


-- ================================================================
-- SOURCE: supabase/migrations/20260904210000_chat_deal_workflows.sql
-- ================================================================

-- Chat deal workflow: offers and safe meeting plans.
create table if not exists public.chat_offers (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  message text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','countered','expired','cancelled')),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (buyer_id <> seller_id)
);

create table if not exists public.chat_meetings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  proposed_by uuid not null references public.profiles(id) on delete cascade,
  meeting_date date not null,
  meeting_time time not null,
  area text not null check (char_length(trim(area)) between 2 and 120),
  status text not null default 'proposed' check (status in ('proposed','accepted','declined','completed','cancelled')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_offers_conversation_idx on public.chat_offers (conversation_id, created_at desc);
create index if not exists chat_meetings_conversation_idx on public.chat_meetings (conversation_id, created_at desc);

alter table public.chat_offers enable row level security;
alter table public.chat_meetings enable row level security;

drop policy if exists chat_offers_participant_read on public.chat_offers;
create policy chat_offers_participant_read on public.chat_offers for select to authenticated using (buyer_id = auth.uid() or seller_id = auth.uid());
drop policy if exists chat_offers_buyer_insert on public.chat_offers;
create policy chat_offers_buyer_insert on public.chat_offers for insert to authenticated with check (buyer_id = auth.uid() and buyer_id <> seller_id);
drop policy if exists chat_offers_participant_update on public.chat_offers;
create policy chat_offers_participant_update on public.chat_offers for update to authenticated using (buyer_id = auth.uid() or seller_id = auth.uid()) with check (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists chat_meetings_participant_read on public.chat_meetings;
create policy chat_meetings_participant_read on public.chat_meetings for select to authenticated using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())));
drop policy if exists chat_meetings_participant_insert on public.chat_meetings;
create policy chat_meetings_participant_insert on public.chat_meetings for insert to authenticated with check (proposed_by = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())));
drop policy if exists chat_meetings_participant_update on public.chat_meetings;
create policy chat_meetings_participant_update on public.chat_meetings for update to authenticated using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))) with check (exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())));

grant select, insert, update on public.chat_offers to authenticated;
grant select, insert, update on public.chat_meetings to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260904220000_secure_business_center_verification.sql
-- ================================================================

-- Secure Business Center and business verification workflow.
-- A business profile remains owned by the personal auth account; verification is
-- only changed by the moderator RPC below.
alter table public.business_profiles
  add column if not exists verification_status text not null default 'not_started',
  add column if not exists verified_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

alter table public.business_profiles
  drop constraint if exists business_profiles_verification_status_check;
alter table public.business_profiles
  add constraint business_profiles_verification_status_check
  check (verification_status in ('not_started','draft','pending_review','under_review','verified','requires_more_information','rejected','suspended'));

alter table public.verification_applications
  drop constraint if exists verification_applications_status_check;
alter table public.verification_applications
  add constraint verification_applications_status_check
  check (status in ('draft','pending','pending_review','under_review','approved','verified','rejected','action_required','requires_more_information','suspended'));

-- Keep the existing identity/seller application path, but force business
-- submissions through the ownership-aware RPC.
drop policy if exists verification_self_insert on public.verification_applications;
create policy verification_self_insert on public.verification_applications
  for insert to authenticated
  with check (user_id = auth.uid() and verification_type in ('identity','seller'));

drop policy if exists business_verification_owner_update on public.verification_applications;
create policy business_verification_owner_update on public.verification_applications
  for update to authenticated
  using (user_id = auth.uid() and verification_type = 'business' and status in ('rejected','requires_more_information'))
  with check (user_id = auth.uid() and verification_type = 'business' and status in ('rejected','requires_more_information'));

create unique index if not exists one_open_business_verification_per_owner
  on public.verification_applications(user_id)
  where verification_type = 'business' and status in ('pending','pending_review','under_review','requires_more_information');

create table if not exists public.business_verification_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.verification_applications(id) on delete cascade,
  business_profile_id uuid not null references public.business_profiles(profile_id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('submitted','under_review','approved','verified','rejected','requires_more_information','suspended','resubmitted','document_uploaded')),
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists business_verification_events_business_idx on public.business_verification_events(business_profile_id, created_at desc);
create index if not exists business_verification_events_application_idx on public.business_verification_events(application_id, created_at desc);
alter table public.business_verification_events enable row level security;
drop policy if exists business_verification_events_owner_read on public.business_verification_events;
create policy business_verification_events_owner_read on public.business_verification_events for select to authenticated
  using (exists (select 1 from public.business_profiles b where b.profile_id = auth.uid() and b.profile_id = business_profile_id));
drop policy if exists business_verification_events_moderator_read on public.business_verification_events;
create policy business_verification_events_moderator_read on public.business_verification_events for select to authenticated
  using (public.current_user_can_moderate());
grant select on public.business_verification_events to authenticated;

create or replace function public.submit_business_verification(
  p_business_name text,
  p_business_address text,
  p_registration_type text,
  p_registration_number text default null,
  p_phone text default null,
  p_notes text default null,
  p_document_path text default null
)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_business public.business_profiles;
  v_old_status text;
  v_row public.verification_applications;
  v_name text := nullif(trim(coalesce(p_business_name, '')), '');
  v_address text := nullif(trim(coalesce(p_business_address, '')), '');
  v_registration text := nullif(trim(coalesce(p_registration_number, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  select * into v_business from public.business_profiles where profile_id = auth.uid() for update;
  if v_business.profile_id is null then raise exception 'BUSINESS_PROFILE_REQUIRED'; end if;
  if v_name is null or v_address is null or v_phone is null then raise exception 'BUSINESS_DETAILS_INCOMPLETE'; end if;
  if p_registration_type not in ('registered','unregistered') then raise exception 'INVALID_BUSINESS_TYPE'; end if;
  if p_registration_type = 'registered' and v_registration is null then raise exception 'REGISTRATION_NUMBER_REQUIRED'; end if;
  if p_document_path is null or trim(p_document_path) = '' then raise exception 'BUSINESS_DOCUMENT_REQUIRED'; end if;
  if not (p_document_path like auth.uid()::text || '/%') then raise exception 'BUSINESS_DOCUMENT_OWNER_MISMATCH'; end if;
  if exists (select 1 from public.verification_applications where user_id = auth.uid() and verification_type = 'business' and status in ('pending','pending_review','under_review','requires_more_information')) then raise exception 'BUSINESS_VERIFICATION_ALREADY_OPEN'; end if;
  select status into v_old_status from public.verification_applications where user_id = auth.uid() and verification_type = 'business' order by created_at desc limit 1;
  insert into public.verification_applications (user_id, verification_type, full_name, phone, business_name, business_registration_type, registration_number, business_address, notes, document_path, status, submitted_at)
  values (auth.uid(), 'business', coalesce((select display_name from public.profiles where id = auth.uid()), v_name), v_phone, v_name, p_registration_type, v_registration, v_address, v_notes, p_document_path, 'pending_review', timezone('utc', now()))
  returning * into v_row;
  update public.business_profiles
  set verification_status = 'pending_review', is_verified = false, verified_at = null, updated_at = timezone('utc', now())
  where profile_id = auth.uid();
  insert into public.business_verification_events (application_id, business_profile_id, actor_id, event_type, from_status, to_status, note)
  values (v_row.id, auth.uid(), auth.uid(), case when v_old_status in ('rejected','requires_more_information') then 'resubmitted' else 'submitted' end, v_old_status, 'pending_review', v_notes);
  return v_row;
end;
$$;
revoke all on function public.submit_business_verification(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_business_verification(text,text,text,text,text,text,text) to authenticated;

create or replace function public.review_business_verification(
  p_application_id uuid,
  p_status text,
  p_reviewer_note text default null
)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row public.verification_applications;
  v_business public.business_profiles;
  v_note text := nullif(trim(coalesce(p_reviewer_note, '')), '');
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information','suspended') then raise exception 'INVALID_BUSINESS_REVIEW_STATUS'; end if;
  select * into v_row from public.verification_applications where id = p_application_id and verification_type = 'business' for update;
  if v_row.id is null then raise exception 'BUSINESS_APPLICATION_NOT_FOUND'; end if;
  update public.verification_applications
  set status = case when p_status = 'verified' then 'verified' else p_status end,
      reviewer_note = v_note,
      reviewed_by = auth.uid(),
      reviewed_at = timezone('utc', now()),
      verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
      updated_at = timezone('utc', now())
  where id = v_row.id
  returning * into v_row;
  update public.business_profiles
  set verification_status = v_row.status,
      is_verified = (p_status = 'verified'),
      verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
      suspended_at = case when p_status = 'suspended' then timezone('utc', now()) else null end,
      suspension_reason = case when p_status = 'suspended' then v_note else null end,
      updated_at = timezone('utc', now())
  where profile_id = v_row.user_id
  returning * into v_business;
  insert into public.business_verification_events (application_id, business_profile_id, actor_id, event_type, from_status, to_status, note)
  values (v_row.id, v_business.profile_id, auth.uid(), p_status, null, v_row.status, v_note);
  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (v_row.user_id, auth.uid(), 'business_verification_reviewed', case when p_status = 'verified' then 'Business verified' else 'Business verification updated' end, coalesce(v_note, 'Your business verification status was updated.'), jsonb_build_object('business_profile_id', v_business.profile_id, 'status', v_row.status));
  return v_row;
end;
$$;
revoke all on function public.review_business_verification(uuid,text,text) from public, anon;
grant execute on function public.review_business_verification(uuid,text,text) to authenticated;

comment on table public.business_verification_events is 'Private audit trail for business verification decisions and submissions.';


-- ================================================================
-- SOURCE: supabase/migrations/20260904230000_public_business_storefronts.sql
-- ================================================================

-- Public mini-store rollout: an active business profile is discoverable even
-- before verification; the verified badge remains controlled by is_verified.
drop policy if exists business_profiles_public_read on public.business_profiles;
create policy business_profiles_public_read on public.business_profiles
  for select to anon, authenticated
  using (is_active = true or profile_id = auth.uid());

comment on policy business_profiles_public_read on public.business_profiles is 'Active business profiles are public storefronts; verification only controls the verified badge.';


-- ================================================================
-- SOURCE: supabase/migrations/20260905150000_admin_ad_campaigns.sql
-- ================================================================

-- Admin-controlled advertising campaigns for Bese26 placements.
create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 5 and 240),
  image_url text,
  cta_label text not null default 'Learn more' check (char_length(cta_label) between 2 and 40),
  cta_target text not null default '/',
  placement text not null default 'home_banner' check (placement in ('home_banner', 'homepage', 'search', 'business_directory')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  priority integer not null default 0 check (priority between 0 and 1000),
  max_impressions integer check (max_impressions is null or max_impressions > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_campaigns_dates_check check (ends_at is null or ends_at > starts_at)
);

create index if not exists ad_campaigns_public_idx on public.ad_campaigns (placement, status, priority desc, starts_at, ends_at);

alter table public.ad_campaigns enable row level security;
drop policy if exists ad_campaigns_public_active_read on public.ad_campaigns;
create policy ad_campaigns_public_active_read on public.ad_campaigns
  for select to anon, authenticated
  using (status = 'active' and starts_at <= now() and (ends_at is null or ends_at > now()));
drop policy if exists ad_campaigns_admin_read on public.ad_campaigns;
create policy ad_campaigns_admin_read on public.ad_campaigns
  for select to authenticated using (private.is_admin());
drop policy if exists ad_campaigns_admin_insert on public.ad_campaigns;
create policy ad_campaigns_admin_insert on public.ad_campaigns
  for insert to authenticated with check (private.is_admin() and created_by = auth.uid());
drop policy if exists ad_campaigns_admin_update on public.ad_campaigns;
create policy ad_campaigns_admin_update on public.ad_campaigns
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists ad_campaigns_admin_delete on public.ad_campaigns;
create policy ad_campaigns_admin_delete on public.ad_campaigns
  for delete to authenticated using (private.is_admin());

drop trigger if exists ad_campaigns_updated_at on public.ad_campaigns;
create trigger ad_campaigns_updated_at before update on public.ad_campaigns for each row execute procedure private.set_updated_at();

grant select on public.ad_campaigns to anon, authenticated;
grant insert, update, delete on public.ad_campaigns to authenticated;
comment on table public.ad_campaigns is 'Admin-controlled campaigns for clearly labelled Bese26 ad placements.';


-- ================================================================
-- SOURCE: supabase/migrations/20260905170000_admin_control_center.sql
-- ================================================================

-- Bese26: central admin control center. All privileged operations are gated
-- server-side; the browser never receives service-role credentials.
alter table public.profiles add column if not exists admin_suspended boolean not null default false;
alter table public.profiles add column if not exists admin_suspension_reason text;
alter table public.profiles add column if not exists admin_suspended_at timestamptz;
alter table public.profiles add column if not exists admin_suspended_by uuid references public.profiles(id) on delete set null;

create or replace function public.admin_control_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
    'counts', jsonb_build_object(
      'users', (select count(*) from public.profiles),
      'suspended_users', (select count(*) from public.profiles where admin_suspended),
      'businesses', (select count(*) from public.business_profiles),
      'active_businesses', (select count(*) from public.business_profiles where is_active),
      'pending_listings', (select count(*) from public.listings where status = 'pending' and moderation_status = 'pending'),
      'live_listings', (select count(*) from public.listings where status = 'active' and moderation_status = 'approved'),
      'open_reports', (select count(*) from public.user_reports where status in ('open','reviewing')),
      'listing_reports', (select count(*) from public.listing_reports where status = 'pending'),
      'open_support', (select count(*) from public.support_tickets where status in ('open','in_progress','waiting_user')),
      'active_ads', (select count(*) from public.ad_campaigns where status = 'active' and starts_at <= now() and (ends_at is null or ends_at > now()))
    ),
    'recent_users', coalesce((select jsonb_agg(to_jsonb(u) order by u.created_at desc) from (select id,username,display_name,account_type,app_role,is_verified,admin_suspended,created_at from public.profiles order by created_at desc limit 12) u), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (select r.id,r.target_type,r.target_id,r.reason,r.description,r.status,r.created_at,p.display_name as reporter_name from public.user_reports r left join public.profiles p on p.id=r.reporter_id where r.status in ('open','reviewing') order by r.created_at desc limit 30) r), '[]'::jsonb),
    'listing_reports', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (select r.id,r.listing_id,r.reason,r.details,r.status,r.created_at,l.title,p.display_name as reporter_name from public.listing_reports r left join public.listings l on l.id=r.listing_id left join public.profiles p on p.id=r.reporter_id where r.status = 'pending' order by r.created_at desc limit 30) r), '[]'::jsonb),
    'support', coalesce((select jsonb_agg(to_jsonb(t) order by t.updated_at desc) from (select t.id,t.ticket_number,t.email,t.subject,t.category,t.message,t.status,t.priority,t.created_at,t.updated_at,p.display_name as user_name from public.support_tickets t left join public.profiles p on p.id=t.user_id where t.status in ('open','in_progress','waiting_user') order by t.updated_at desc limit 30) t), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.admin_control_overview() from public, anon;
grant execute on function public.admin_control_overview() to authenticated;

create or replace function public.admin_update_report(p_report_id uuid, p_status text)
returns public.user_reports
language plpgsql security definer set search_path = public as $$
declare v_row public.user_reports;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('open','reviewing','resolved','dismissed') then raise exception 'Invalid report status'; end if;
  update public.user_reports set status=p_status, updated_at=timezone('utc',now()) where id=p_report_id returning * into v_row;
  if v_row.id is null then raise exception 'Report not found'; end if;
  return v_row;
end; $$;
revoke all on function public.admin_update_report(uuid,text) from public, anon;
grant execute on function public.admin_update_report(uuid,text) to authenticated;

create or replace function public.admin_update_listing_report(p_report_id uuid, p_status text)
returns public.listing_reports
language plpgsql security definer set search_path = public as $$
declare v_row public.listing_reports;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('pending','reviewed','resolved','dismissed') then raise exception 'Invalid listing report status'; end if;
  update public.listing_reports set status=p_status, updated_at=timezone('utc',now()) where id=p_report_id returning * into v_row;
  if v_row.id is null then raise exception 'Listing report not found'; end if;
  return v_row;
end; $$;
revoke all on function public.admin_update_listing_report(uuid,text) from public, anon;
grant execute on function public.admin_update_listing_report(uuid,text) to authenticated;

create or replace function public.admin_update_support_ticket(p_ticket_id uuid, p_status text, p_priority text default null)
returns public.support_tickets
language plpgsql security definer set search_path = public as $$
declare v_row public.support_tickets;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('open','in_progress','waiting_user','resolved','closed') then raise exception 'Invalid support status'; end if;
  if p_priority is not null and p_priority not in ('low','normal','high','urgent') then raise exception 'Invalid support priority'; end if;
  update public.support_tickets set status=p_status, priority=coalesce(p_priority,priority), updated_at=timezone('utc',now()) where id=p_ticket_id returning * into v_row;
  if v_row.id is null then raise exception 'Support ticket not found'; end if;
  return v_row;
end; $$;
revoke all on function public.admin_update_support_ticket(uuid,text,text) from public, anon;
grant execute on function public.admin_update_support_ticket(uuid,text,text) to authenticated;

create or replace function public.admin_set_user_access(p_user_id uuid, p_suspended boolean, p_reason text default null)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v_row public.profiles;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot suspend your own admin account'; end if;
  update public.profiles set admin_suspended=p_suspended, admin_suspension_reason=case when p_suspended then nullif(trim(p_reason),'') else null end, admin_suspended_at=case when p_suspended then timezone('utc',now()) else null end, admin_suspended_by=case when p_suspended then auth.uid() else null end where id=p_user_id returning * into v_row;
  if v_row.id is null then raise exception 'User not found'; end if;
  return v_row;
end; $$;
revoke all on function public.admin_set_user_access(uuid,boolean,text) from public, anon;
grant execute on function public.admin_set_user_access(uuid,boolean,text) to authenticated;

create or replace function public.admin_set_business_visibility(p_profile_id uuid, p_is_active boolean)
returns public.business_profiles
language plpgsql security definer set search_path = public as $$
declare v_row public.business_profiles;
begin
  if not private.is_moderator_or_admin() then raise exception 'Admin access required'; end if;
  update public.business_profiles set is_active=p_is_active, updated_at=timezone('utc',now()) where profile_id=p_profile_id returning * into v_row;
  if v_row.profile_id is null then raise exception 'Business not found'; end if;
  return v_row;
end; $$;
revoke all on function public.admin_set_business_visibility(uuid,boolean) from public, anon;
grant execute on function public.admin_set_business_visibility(uuid,boolean) to authenticated;

comment on function public.admin_control_overview() is 'Admin-only dashboard metrics and operational queues for Bese26.';


-- ================================================================
-- SOURCE: supabase/migrations/20260905180000_lock_owner_admin_email.sql
-- ================================================================

-- Bese26 owner-admin lock: only this verified auth email may use admin controls.
-- Role labels remain useful for display, but privileged checks are email-bound.
update public.profiles as p
set app_role = 'user'
from auth.users as u
where p.id = u.id
  and p.app_role = 'admin'
  and lower(coalesce(u.email, '')) <> 'smbabanbaba@gmail.com';

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

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_bese26_owner_admin();
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

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
security invoker
set search_path = public
as $$
  select private.is_bese26_owner_admin();
$$;
revoke all on function public.current_user_can_moderate() from public, anon;
grant execute on function public.current_user_can_moderate() to authenticated;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select private.is_bese26_owner_admin();
$$;
revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;

comment on function private.is_bese26_owner_admin() is 'Only smbabanbaba@gmail.com is authorized as the Bese26 owner administrator.';


-- ================================================================
-- SOURCE: supabase/migrations/20260905181000_owner_email_is_authoritative.sql
-- ================================================================

-- The approved owner email is authoritative. A role label is not required for access.
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
    left join public.profiles p on p.id = u.id
    where u.id = auth.uid()
      and lower(coalesce(u.email, '')) = 'smbabanbaba@gmail.com'
      and coalesce(p.admin_suspended, false) = false
  );
$$;
revoke all on function private.is_bese26_owner_admin() from public, anon;
grant execute on function private.is_bese26_owner_admin() to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260905190000_admin_marketplace_operations.sql
-- ================================================================

-- Remaining admin operations: marketplace settings and operational workflows.
create or replace function public.admin_marketplace_operations()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order, c.name) from (select id,parent_id,name,slug,icon,sort_order,is_active from public.categories order by sort_order,name limit 200) c), '[]'::jsonb),
    'boost_packages', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from (select id,name,duration_days,price_kobo,placement,is_active,created_at from public.boost_packages order by created_at desc) b), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (select r.id,r.listing_id,r.reviewer_id,r.rating,r.body,r.status,r.created_at,l.title,p.display_name as reviewer_name from public.reviews r left join public.listings l on l.id=r.listing_id left join public.profiles p on p.id=r.reviewer_id where r.status='pending' order by r.created_at desc limit 50) r), '[]'::jsonb),
    'callbacks', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from (select c.id,c.listing_id,c.requester_id,c.seller_id,c.message,c.status,c.created_at,l.title,p.display_name as requester_name from public.listing_callback_requests c left join public.listings l on l.id=c.listing_id left join public.profiles p on p.id=c.requester_id where c.status in ('pending','contacted') order by c.created_at desc limit 50) c), '[]'::jsonb),
    'active_boosts', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from (select b.id,b.listing_id,b.seller_id,b.package_id,b.status,b.starts_at,b.ends_at,l.title,p.display_name as seller_name from public.listing_boosts b left join public.listings l on l.id=b.listing_id left join public.profiles p on p.id=b.seller_id where b.status in ('pending','active') order by b.created_at desc limit 50) b), '[]'::jsonb),
    'payment_summary', jsonb_build_object('transactions', (select count(*) from public.payment_transactions), 'successful', (select count(*) from public.payment_transactions where status='success'), 'pending', (select count(*) from public.payment_transactions where status='pending')),
    'analytics', jsonb_build_object('views_7d', (select count(*) from public.listing_views where viewed_at >= timezone('utc',now()) - interval '7 days'), 'offers', (select count(*) from public.chat_offers), 'meetings', (select count(*) from public.chat_meetings), 'conversations', (select count(*) from public.conversations))
  ) into v_result;
  return v_result;
end; $$;
revoke all on function public.admin_marketplace_operations() from public, anon;
grant execute on function public.admin_marketplace_operations() to authenticated;

create or replace function public.admin_update_review(p_review_id uuid, p_status text)
returns public.reviews language plpgsql security definer set search_path=public as $$
declare v_row public.reviews;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('pending','published','rejected') then raise exception 'Invalid review status'; end if;
  update public.reviews set status=p_status where id=p_review_id returning * into v_row;
  if v_row.id is null then raise exception 'Review not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_update_review(uuid,text) from public, anon;
grant execute on function public.admin_update_review(uuid,text) to authenticated;

create or replace function public.admin_update_callback(p_callback_id uuid, p_status text)
returns public.listing_callback_requests language plpgsql security definer set search_path=public as $$
declare v_row public.listing_callback_requests;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('pending','contacted','completed','cancelled') then raise exception 'Invalid callback status'; end if;
  update public.listing_callback_requests set status=p_status, updated_at=timezone('utc',now()) where id=p_callback_id returning * into v_row;
  if v_row.id is null then raise exception 'Callback request not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_update_callback(uuid,text) from public, anon;
grant execute on function public.admin_update_callback(uuid,text) to authenticated;

create or replace function public.admin_update_boost(p_boost_id uuid, p_status text)
returns public.listing_boosts language plpgsql security definer set search_path=public as $$
declare v_row public.listing_boosts;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('pending','active','expired','cancelled','failed') then raise exception 'Invalid boost status'; end if;
  update public.listing_boosts set status=p_status, updated_at=timezone('utc',now()) where id=p_boost_id returning * into v_row;
  if v_row.id is null then raise exception 'Boost not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_update_boost(uuid,text) from public, anon;
grant execute on function public.admin_update_boost(uuid,text) to authenticated;

create or replace function public.admin_set_category_active(p_category_id uuid, p_is_active boolean)
returns public.categories language plpgsql security definer set search_path=public as $$
declare v_row public.categories;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  update public.categories set is_active=p_is_active, updated_at=timezone('utc',now()) where id=p_category_id returning * into v_row;
  if v_row.id is null then raise exception 'Category not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_set_category_active(uuid,boolean) from public, anon;
grant execute on function public.admin_set_category_active(uuid,boolean) to authenticated;

create or replace function public.admin_upsert_boost_package(p_id uuid, p_name text, p_duration_days integer, p_price_kobo integer, p_placement text, p_is_active boolean)
returns public.boost_packages language plpgsql security definer set search_path=public as $$
declare v_row public.boost_packages;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  if p_name is null or char_length(trim(p_name)) < 3 or p_duration_days <= 0 or p_price_kobo <= 0 or p_placement not in ('featured','top_search','homepage') then raise exception 'Invalid boost package'; end if;
  if p_id is null then insert into public.boost_packages(name,duration_days,price_kobo,placement,is_active) values(trim(p_name),p_duration_days,p_price_kobo,p_placement,p_is_active) returning * into v_row;
  else update public.boost_packages set name=trim(p_name),duration_days=p_duration_days,price_kobo=p_price_kobo,placement=p_placement,is_active=p_is_active where id=p_id returning * into v_row; end if;
  if v_row.id is null then raise exception 'Boost package not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_upsert_boost_package(uuid,text,integer,integer,text,boolean) from public, anon;
grant execute on function public.admin_upsert_boost_package(uuid,text,integer,integer,text,boolean) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260905192000_admin_directory_listing_controls.sql
-- ================================================================

create or replace function public.admin_directory_controls()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
    'businesses', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from (select bp.profile_id,bp.business_name,bp.business_handle,bp.is_active,bp.is_verified,bp.city,bp.state,bp.created_at,p.display_name as owner_name from public.business_profiles bp left join public.profiles p on p.id=bp.profile_id order by bp.created_at desc limit 50) b), '[]'::jsonb),
    'listings', coalesce((select jsonb_agg(to_jsonb(l) order by l.updated_at desc) from (select l.id,l.title,l.status,l.moderation_status,l.price,l.currency,l.city,l.state,l.updated_at,p.display_name as seller_name from public.listings l left join public.profiles p on p.id=l.seller_id order by l.updated_at desc limit 50) l), '[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;
revoke all on function public.admin_directory_controls() from public, anon;
grant execute on function public.admin_directory_controls() to authenticated;

create or replace function public.admin_set_listing_lifecycle(p_listing_id uuid, p_status text)
returns public.listings language plpgsql security definer set search_path=public as $$
declare v_row public.listings;
begin
  if not private.is_bese26_owner_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('draft','pending','active','paused','sold','archived','rejected') then raise exception 'Invalid listing status'; end if;
  update public.listings set status=p_status, updated_at=timezone('utc',now()) where id=p_listing_id returning * into v_row;
  if v_row.id is null then raise exception 'Listing not found'; end if; return v_row;
end; $$;
revoke all on function public.admin_set_listing_lifecycle(uuid,text) from public, anon;
grant execute on function public.admin_set_listing_lifecycle(uuid,text) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260907010000_admin_user_account_actions.sql
-- ================================================================

-- Admin account safety actions: reversible suspension and audited hard deletion.
-- The authoritative owner admin account can never be suspended or deleted.
create or replace function public.admin_set_user_access(
  p_user_id uuid,
  p_suspended boolean,
  p_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row public.profiles;
  v_email text;
begin
  if not private.is_bese26_owner_admin() then
    raise exception 'Admin access required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own admin access';
  end if;
  select lower(email) into v_email from auth.users where id = p_user_id;
  if v_email = 'smbabanbaba@gmail.com' then
    raise exception 'The authoritative owner admin is protected';
  end if;
  if p_suspended and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required to suspend an account';
  end if;
  update public.profiles
     set admin_suspended = p_suspended,
         admin_suspension_reason = case when p_suspended then nullif(trim(p_reason), '') else null end,
         admin_suspended_at = case when p_suspended then timezone('utc', now()) else null end,
         admin_suspended_by = case when p_suspended then auth.uid() else null end,
         updated_at = timezone('utc', now())
   where id = p_user_id
   returning * into v_row;
  if v_row.id is null then
    raise exception 'User not found';
  end if;
  return v_row;
end;
$$;
revoke all on function public.admin_set_user_access(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_user_access(uuid, boolean, text) to authenticated;

create or replace function public.admin_delete_user(
  p_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  if not private.is_bese26_owner_admin() then
    raise exception 'Admin access required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own admin account';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required to delete an account';
  end if;
  select lower(email) into v_email from auth.users where id = p_user_id;
  if v_email is null then
    raise exception 'User not found';
  end if;
  if v_email = 'smbabanbaba@gmail.com' then
    raise exception 'The authoritative owner admin is protected';
  end if;
  -- Deleting auth.users invokes the existing foreign-key cleanup rules for this app.
  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;
revoke all on function public.admin_delete_user(uuid, text) from public, anon;
grant execute on function public.admin_delete_user(uuid, text) to authenticated;

comment on function public.admin_set_user_access(uuid, boolean, text) is 'Owner-admin-only reversible account suspension with required reason and owner protection.';
comment on function public.admin_delete_user(uuid, text) is 'Owner-admin-only permanent account deletion with required reason and owner protection.';


-- ================================================================
-- SOURCE: supabase/migrations/20260907220000_chat_media_storage.sql
-- ================================================================

-- Private storage for participant-only chat images and voice notes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 8388608, array['image/jpeg','image/png','image/webp','image/gif','application/pdf','audio/webm','audio/ogg','audio/mp4','audio/mpeg']::text[])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists chat_media_insert on storage.objects;
create policy chat_media_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and private.is_conversation_participant(((storage.foldername(name))[2])::uuid)
);

drop policy if exists chat_media_read on storage.objects;
create policy chat_media_read on storage.objects
for select to authenticated
using (
  bucket_id = 'chat-media'
  and private.is_conversation_participant(((storage.foldername(name))[2])::uuid)
);

drop policy if exists chat_media_delete on storage.objects;
create policy chat_media_delete on storage.objects
for delete to authenticated
using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);


-- ================================================================
-- SOURCE: supabase/migrations/20260908013000_business_contact_preference.sql
-- ================================================================

alter table public.business_profiles
  add column if not exists contact_preference text not null default 'both';

alter table public.business_profiles
  drop constraint if exists business_profiles_contact_preference_check;

alter table public.business_profiles
  add constraint business_profiles_contact_preference_check
  check (contact_preference in ('whatsapp', 'call', 'both'));

comment on column public.business_profiles.contact_preference is 'Public contact actions shown on business storefronts and listing cards.';


-- ================================================================
-- SOURCE: supabase/migrations/20260909180000_paid_entitlements_and_verification_gate.sql
-- ================================================================

-- Bese26 paid entitlements: automatic monthly boosts, paid listing limits, and verification gate.
-- Credits are allocated lazily per UTC month, so no cron job is required.

create table if not exists public.seller_monthly_boost_credits (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  credits_granted integer not null check (credits_granted >= 0),
  credits_used integer not null default 0 check (credits_used >= 0 and credits_used <= credits_granted),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, period_start)
);

alter table public.seller_monthly_boost_credits enable row level security;
drop policy if exists seller_monthly_boost_credits_owner_read on public.seller_monthly_boost_credits;
create policy seller_monthly_boost_credits_owner_read on public.seller_monthly_boost_credits
  for select to authenticated using (profile_id = auth.uid());
grant select on public.seller_monthly_boost_credits to authenticated;
revoke insert, update, delete on public.seller_monthly_boost_credits from anon, authenticated;

drop trigger if exists seller_monthly_boost_credits_updated_at on public.seller_monthly_boost_credits;
create trigger seller_monthly_boost_credits_updated_at before update on public.seller_monthly_boost_credits
  for each row execute procedure private.set_updated_at();

create or replace function public.current_paid_plan(p_user uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select case
    when s.status = 'active' and (s.current_period_end is null or s.current_period_end > now())
      and s.plan_key in ('premium', 'business') then s.plan_key
    else null
  end
  from public.seller_subscriptions s
  where s.profile_id = p_user;
$$;
revoke all on function public.current_paid_plan(uuid) from public, anon;
revoke all on function public.current_paid_plan(uuid) from authenticated;

create or replace function public.current_active_plan(p_user uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select case when s.status = 'active' and (s.current_period_end is null or s.current_period_end > now()) then s.plan_key else 'free' end
  from public.seller_subscriptions s where s.profile_id = p_user;
$$;
revoke all on function public.current_active_plan(uuid) from public, anon;
revoke all on function public.current_active_plan(uuid) from authenticated;

create or replace function public.ensure_monthly_boost_credits(p_user uuid default auth.uid())
returns table (period_start date, plan_key text, credits_granted integer, credits_used integer, credits_remaining integer)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_plan text := public.current_paid_plan(p_user);
  v_period date := date_trunc('month', timezone('utc', now()))::date;
  v_grant integer := case v_plan when 'premium' then 5 when 'business' then 10 else 0 end;
  v_row public.seller_monthly_boost_credits;
begin
  if p_user is null or auth.uid() is distinct from p_user and not public.current_user_can_moderate() then
    raise exception 'OWNER_REQUIRED';
  end if;
  insert into public.seller_monthly_boost_credits(profile_id, period_start, credits_granted)
  values (p_user, v_period, v_grant)
  on conflict (profile_id, period_start) do update
    set credits_granted = greatest(public.seller_monthly_boost_credits.credits_granted, excluded.credits_granted), updated_at = now()
  returning * into v_row;
  return query select v_row.period_start, coalesce(v_plan, 'free'), v_row.credits_granted, v_row.credits_used, greatest(v_row.credits_granted - v_row.credits_used, 0);
end;
$$;
revoke all on function public.ensure_monthly_boost_credits(uuid) from public, anon;
grant execute on function public.ensure_monthly_boost_credits(uuid) to authenticated;

-- Keep entitlement output authoritative for the UI and server-side checks.
drop function if exists public.get_seller_entitlement();
create function public.get_seller_entitlement()
returns table (
  plan_key text, subscription_status text, is_paid boolean, free_posts_limit integer,
  free_posts_used integer, free_posts_remaining integer, listing_limit integer,
  current_period_end timestamptz, boost_credits_limit integer, boost_credits_used integer,
  boost_credits_remaining integer, verification_eligible boolean
)
language plpgsql security definer set search_path = public, private
as $$
declare
  v_user uuid := auth.uid(); v_plan text := 'free'; v_status text := 'inactive'; v_end timestamptz;
  v_paid boolean := false; v_used integer := 0; v_boost record;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select s.plan_key, s.status, s.current_period_end into v_plan, v_status, v_end from public.seller_subscriptions s where s.profile_id = v_user;
  v_paid := v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free';
  select u.free_posts_used into v_used from public.seller_post_usage u where u.profile_id = v_user;
  select * into v_boost from public.ensure_monthly_boost_credits(v_user);
  return query select v_plan, v_status, v_paid, 3, coalesce(v_used, 0), greatest(3 - coalesce(v_used, 0), 0),
    case v_plan when 'basic' then 15 when 'premium' then 35 when 'business' then 60 else 3 end,
    v_end, coalesce(v_boost.credits_granted, 0), coalesce(v_boost.credits_used, 0), coalesce(v_boost.credits_remaining, 0),
    v_plan in ('premium', 'business') and v_paid;
end;
$$;
revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;

-- Enforce active listing limits for every insert/update path, including server RPCs.
create or replace function public.enforce_paid_listing_limit()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare
  v_plan text; v_limit integer; v_count integer;
begin
  if new.status <> 'active' then return new; end if;
  v_plan := public.current_active_plan(coalesce(new.seller_id, auth.uid()));
  v_limit := case v_plan when 'premium' then 35 when 'business' then 60 when 'basic' then 15 else 3 end;
  select count(*) into v_count from public.listings l where l.seller_id = new.seller_id and l.status = 'active' and l.id <> new.id;
  if v_count >= v_limit then raise exception 'ACTIVE_LISTING_LIMIT_REACHED'; end if;
  return new;
end;
$$;
drop trigger if exists listings_paid_limit_guard on public.listings;
create trigger listings_paid_limit_guard before insert or update of status on public.listings
for each row execute procedure public.enforce_paid_listing_limit();

-- Verification can only be submitted by active Premium/Business users.
create or replace function public.enforce_paid_verification_gate()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.user_id = auth.uid() and not public.current_user_can_moderate() and public.current_paid_plan(new.user_id) is null then
    raise exception 'PAID_PLAN_REQUIRED_FOR_VERIFICATION';
  end if;
  return new;
end;
$$;
drop trigger if exists verification_paid_plan_guard on public.verification_applications;
create trigger verification_paid_plan_guard before insert or update on public.verification_applications
for each row execute procedure public.enforce_paid_verification_gate();

-- Internal three-day package used by free credits; it is not shown in the public paid package list.
alter table public.boost_packages add column if not exists is_public boolean not null default true;
insert into public.boost_packages(name, duration_days, price_kobo, placement, is_active, is_public)
select 'Included 3-day boost', 3, 1, 'featured', true, false
where not exists (select 1 from public.boost_packages where name = 'Included 3-day boost');

drop policy if exists boost_packages_public_read on public.boost_packages;
create policy boost_packages_public_read on public.boost_packages for select to anon, authenticated using (is_active = true and is_public = true);

create or replace function public.redeem_free_boost_credit(p_listing_id uuid)
returns public.listing_boosts
language plpgsql security definer set search_path = public, private
as $$
declare
  v_user uuid := auth.uid(); v_plan text; v_period date := date_trunc('month', timezone('utc', now()))::date;
  v_credits public.seller_monthly_boost_credits; v_listing public.listings; v_package public.boost_packages; v_boost public.listing_boosts;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_plan := public.current_paid_plan(v_user);
  if v_plan is null then raise exception 'PAID_PLAN_REQUIRED_FOR_FREE_BOOST'; end if;
  select * into v_listing from public.listings where id = p_listing_id and seller_id = v_user and status = 'active' for update;
  if v_listing.id is null then raise exception 'ACTIVE_LISTING_REQUIRED'; end if;
  perform public.ensure_monthly_boost_credits(v_user);
  select * into v_credits from public.seller_monthly_boost_credits where profile_id = v_user and period_start = v_period for update;
  if v_credits.credits_used >= v_credits.credits_granted then raise exception 'NO_FREE_BOOST_CREDITS'; end if;
  select * into v_package from public.boost_packages where name = 'Included 3-day boost' and is_active and not is_public limit 1;
  insert into public.listing_boosts(listing_id, seller_id, package_id, status, starts_at, ends_at)
  values (p_listing_id, v_user, v_package.id, 'active', now(), now() + interval '3 days') returning * into v_boost;
  update public.seller_monthly_boost_credits set credits_used = credits_used + 1, updated_at = now() where profile_id = v_user and period_start = v_period;
  return v_boost;
end;
$$;
revoke all on function public.redeem_free_boost_credit(uuid) from public, anon;
grant execute on function public.redeem_free_boost_credit(uuid) to authenticated;


-- Keep approved verification tied to the active paid plan period.
create or replace function public.sync_verification_expiry_to_subscription()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_expiry timestamptz := coalesce(new.current_period_end, now() + interval '1 month');
begin
  if new.status = 'active' and new.plan_key in ('premium', 'business') then
    update public.profiles
       set verification_expires_at = v_expiry
     where id = new.profile_id and is_verified = true;
    update public.business_profiles
       set verification_expires_at = v_expiry
     where profile_id = new.profile_id and is_verified = true;
  else
    update public.profiles
       set verification_expires_at = least(coalesce(verification_expires_at, now()), now())
     where id = new.profile_id and is_verified = true;
    update public.business_profiles
       set verification_expires_at = least(coalesce(verification_expires_at, now()), now())
     where profile_id = new.profile_id and is_verified = true;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_verification_expiry_on_subscription on public.seller_subscriptions;
create trigger sync_verification_expiry_on_subscription
after insert or update of plan_key, status, current_period_end on public.seller_subscriptions
for each row execute procedure public.sync_verification_expiry_to_subscription();

revoke all on function public.sync_verification_expiry_to_subscription() from public, anon, authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260909190000_harden_chat_deal_permissions.sql
-- ================================================================

-- Harden Chat and Safe Deal workflows so participants cannot spoof parties or statuses.

create or replace function public.validate_chat_deal_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid;
  v_seller uuid;
  v_listing_seller uuid;
begin
  select c.buyer_id, c.seller_id into v_buyer, v_seller
  from public.conversations c where c.id = new.conversation_id;
  if v_buyer is null or v_seller is null then
    raise exception 'Conversation participants could not be verified';
  end if;

  if tg_table_name = 'chat_offers' then
    if new.buyer_id <> v_buyer or new.seller_id <> v_seller or new.buyer_id = new.seller_id then
      raise exception 'Offer parties must match the conversation';
    end if;
    if new.listing_id is null then
      raise exception 'Offer must reference a listing';
    end if;
    select l.seller_id into v_listing_seller from public.listings l where l.id = new.listing_id and l.status = 'active' and l.moderation_status = 'approved';
    if v_listing_seller is null or v_listing_seller <> v_seller then
      raise exception 'Offer listing is not active or does not belong to the seller';
    end if;
    if tg_op = 'INSERT' and new.status <> 'pending' then
      raise exception 'New offers must start as pending';
    end if;
    if tg_op = 'UPDATE' then
      if auth.uid() = v_seller and new.status not in ('accepted','rejected','countered') then
        raise exception 'Seller cannot use this offer status';
      end if;
      if auth.uid() = v_buyer and new.status <> 'cancelled' then
        raise exception 'Buyer can only cancel an offer';
      end if;
    end if;
  else
    if not (new.proposed_by = v_buyer or new.proposed_by = v_seller) then
      raise exception 'Meeting proposer must be a conversation participant';
    end if;
    if new.meeting_date < current_date then
      raise exception 'Meeting date cannot be in the past';
    end if;
    if tg_op = 'UPDATE' and new.status = 'cancelled' and auth.uid() <> old.proposed_by then
      raise exception 'Only the meeting proposer can cancel';
    end if;
    if tg_op = 'UPDATE' and new.status in ('accepted','declined') and auth.uid() = old.proposed_by then
      raise exception 'The other participant must respond to the meeting proposal';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists chat_offers_validate_permissions on public.chat_offers;
create trigger chat_offers_validate_permissions before insert or update on public.chat_offers for each row execute function public.validate_chat_deal_permissions();
drop trigger if exists chat_meetings_validate_permissions on public.chat_meetings;
create trigger chat_meetings_validate_permissions before insert or update on public.chat_meetings for each row execute function public.validate_chat_deal_permissions();

revoke update on public.chat_offers from authenticated;
revoke update on public.chat_meetings from authenticated;
grant update (status, updated_at) on public.chat_offers to authenticated;
grant update (status, updated_at) on public.chat_meetings to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260909193000_business_verification_subscription_expiry.sql
-- ================================================================

-- Business verification requires an active Business subscription.
-- A verified business keeps its decision, but its public verification badge is
-- automatically disabled when the subscription period ends. Renewal restores
-- the badge only when the latest moderation decision is still verified.

alter table public.business_profiles
  drop constraint if exists business_profiles_verification_status_check;
alter table public.business_profiles
  add constraint business_profiles_verification_status_check
  check (verification_status in ('not_started','draft','pending_review','under_review','verified','requires_more_information','rejected','suspended','subscription_expired'));

alter table public.business_profiles
  add column if not exists verification_expires_at timestamptz,
  add column if not exists verification_plan_key text;

alter table public.business_profiles
  drop constraint if exists business_profiles_verification_plan_key_check;
alter table public.business_profiles
  add constraint business_profiles_verification_plan_key_check
  check (verification_plan_key is null or verification_plan_key in ('business'));

create index if not exists business_profiles_verification_expiry_idx
  on public.business_profiles (verification_expires_at)
  where is_verified = true and verification_expires_at is not null;

create or replace function public.sync_business_verification_entitlements()
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_changed integer := 0;
begin
  -- Expire only badges that were granted with a subscription end date.
  -- The moderation application remains verified, so a renewed plan can restore
  -- the badge without silently creating a new approval decision.
  with expired as (
    update public.business_profiles b
       set is_verified = false,
           verification_status = 'subscription_expired',
           updated_at = timezone('utc', now())
     where b.is_verified = true
       and b.verification_expires_at is not null
       and b.verification_expires_at <= timezone('utc', now())
     returning b.profile_id, b.business_name
  )
  select count(*)::integer into v_changed from expired;

  -- A renewal restores a previously subscription-expired badge only when the
  -- latest business moderation application is still verified.
  with renewed as (
    update public.business_profiles b
       set is_verified = true,
           verification_status = 'verified',
           verified_at = coalesce(b.verified_at, timezone('utc', now())),
           verification_expires_at = s.current_period_end,
           verification_plan_key = s.plan_key,
           updated_at = timezone('utc', now())
      from public.seller_subscriptions s
     where b.profile_id = s.profile_id
       and b.verification_status = 'subscription_expired'
       and s.plan_key = 'business'
       and s.status = 'active'
       and (s.current_period_end is null or s.current_period_end > timezone('utc', now()))
       and exists (
         select 1
           from public.verification_applications a
          where a.user_id = b.profile_id
            and a.verification_type = 'business'
            and a.status = 'verified'
       )
     returning b.profile_id
  )
  select v_changed + count(*)::integer into v_changed from renewed;

  return v_changed;
end;
$$;

revoke all on function public.sync_business_verification_entitlements() from public, anon;
grant execute on function public.sync_business_verification_entitlements() to authenticated;

create or replace function public.sync_business_verification_on_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform public.sync_business_verification_entitlements();
  return new;
end;
$$;

revoke all on function public.sync_business_verification_on_subscription_change() from public, anon;

drop trigger if exists seller_subscription_verification_sync on public.seller_subscriptions;
create trigger seller_subscription_verification_sync
after insert or update of plan_key, status, current_period_end
on public.seller_subscriptions
for each row execute function public.sync_business_verification_on_subscription_change();

-- Replace the moderation approval RPC so a business cannot receive a verified
-- badge without an active Business subscription.
create or replace function public.review_business_verification(
  p_application_id uuid,
  p_status text,
  p_reviewer_note text default null
)
returns public.verification_applications
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row public.verification_applications;
  v_business public.business_profiles;
  v_plan public.seller_subscriptions;
  v_note text := nullif(trim(coalesce(p_reviewer_note, '')), '');
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if p_status not in ('under_review','verified','rejected','requires_more_information','suspended') then raise exception 'INVALID_BUSINESS_REVIEW_STATUS'; end if;
  select * into v_row from public.verification_applications where id = p_application_id and verification_type = 'business' for update;
  if v_row.id is null then raise exception 'BUSINESS_APPLICATION_NOT_FOUND'; end if;

  if p_status = 'verified' then
    select * into v_plan
      from public.seller_subscriptions
     where profile_id = v_row.user_id
     for update;
    if v_plan.profile_id is null
       or v_plan.plan_key <> 'business'
       or v_plan.status <> 'active'
       or (v_plan.current_period_end is not null and v_plan.current_period_end <= timezone('utc', now())) then
      raise exception 'ACTIVE_BUSINESS_SUBSCRIPTION_REQUIRED';
    end if;
  end if;

  update public.verification_applications
     set status = case when p_status = 'verified' then 'verified' else p_status end,
         reviewer_note = v_note,
         reviewed_by = auth.uid(),
         reviewed_at = timezone('utc', now()),
         verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
         updated_at = timezone('utc', now())
   where id = v_row.id
   returning * into v_row;

  update public.business_profiles
     set verification_status = v_row.status,
         is_verified = (p_status = 'verified'),
         verified_at = case when p_status = 'verified' then timezone('utc', now()) else null end,
         verification_expires_at = case when p_status = 'verified' then v_plan.current_period_end else null end,
         verification_plan_key = case when p_status = 'verified' then v_plan.plan_key else null end,
         suspended_at = case when p_status = 'suspended' then timezone('utc', now()) else null end,
         suspension_reason = case when p_status = 'suspended' then v_note else null end,
         updated_at = timezone('utc', now())
   where profile_id = v_row.user_id
   returning * into v_business;

  insert into public.business_verification_events (application_id, business_profile_id, actor_id, event_type, from_status, to_status, note)
  values (v_row.id, v_business.profile_id, auth.uid(), p_status, null, v_row.status, v_note);
  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (v_row.user_id, auth.uid(), 'business_verification_reviewed', case when p_status = 'verified' then 'Business verified' else 'Business verification updated' end, coalesce(v_note, 'Your business verification status was updated.'), jsonb_build_object('business_profile_id', v_business.profile_id, 'status', v_row.status));
  return v_row;
end;
$$;

revoke all on function public.review_business_verification(uuid,text,text) from public, anon;
grant execute on function public.review_business_verification(uuid,text,text) to authenticated;

-- Backfill verified businesses with the current paid period, then remove badges
-- whose plan is already inactive or expired.
update public.business_profiles b
   set verification_expires_at = s.current_period_end,
       verification_plan_key = s.plan_key,
       updated_at = timezone('utc', now())
  from public.seller_subscriptions s
 where b.profile_id = s.profile_id
   and b.is_verified = true
   and s.plan_key = 'business'
   and s.status = 'active';

select public.sync_business_verification_entitlements();

-- Supabase projects commonly expose pg_cron. Keep the migration safe on projects
-- where the extension is not enabled; the subscription trigger and the explicit
-- sync function still enforce the rule whenever subscription data changes.
do $$
begin
  begin
    execute 'create extension if not exists pg_cron with schema extensions';
  exception when others then
    null;
  end;
  if to_regnamespace('cron') is not null then
    begin
      perform cron.unschedule(jobid)
        from cron.job
       where jobname = 'bese26-sync-business-verification';
    exception when others then
      null;
    end;
    begin
      perform cron.schedule(
        'bese26-sync-business-verification',
        '*/15 * * * *',
        'select public.sync_business_verification_entitlements();'
      );
    exception when others then
      null;
    end;
  end if;
end;
$$;

comment on column public.business_profiles.verification_expires_at is 'Business verification badge expiry tied to the active Business subscription period.';
comment on column public.business_profiles.verification_plan_key is 'Subscription plan that supported the current business verification badge.';
comment on function public.sync_business_verification_entitlements() is 'Expires subscription-backed business verification and restores it after an eligible renewal.';


-- ================================================================
-- SOURCE: supabase/migrations/20260910103000_enable_auto_publish.sql
-- ================================================================

-- Bese26 optional auto-publish mode requested by the owner.
-- New listings are created by the trusted authenticated seller flow and become
-- visible immediately after the client marks them active.

drop policy if exists listings_owner_insert on public.listings;
create policy listings_owner_insert on public.listings
for insert to authenticated
with check (
  seller_id = auth.uid()
  and status in ('pending', 'active')
  and moderation_status in ('pending', 'approved')
);

drop policy if exists listings_owner_update on public.listings;
create policy listings_owner_update on public.listings
for update to authenticated
using (seller_id = auth.uid())
with check (
  seller_id = auth.uid()
  and status in ('draft', 'pending', 'active', 'paused', 'sold', 'archived')
  and moderation_status in ('pending', 'approved')
);


-- ================================================================
-- SOURCE: supabase/migrations/20260911010000_public_marketplace_media.sql
-- ================================================================

-- Public marketplace media must load for anonymous visitors and shared links.
-- Keep private verification documents separate.
update storage.buckets
set public = true
where id in ('listing-media', 'avatars');

-- Public buckets serve objects through getPublicUrl; upload/update/delete remain
-- protected by the existing authenticated storage policies.


-- ================================================================
-- SOURCE: supabase/migrations/20260911090000_expand_listing_categories.sql
-- ================================================================

-- Keep the Sell form's marketplace taxonomy aligned with the categories offered in the UI.
-- Existing category slugs are preserved; missing parents and children are added idempotently.

insert into public.categories (name, slug, icon, sort_order) values
  ('Babies & Kids', 'babies-kids', 'baby', 100),
  ('Sports & Fitness', 'sports-fitness', 'dumbbell', 110),
  ('Books & Education', 'books-education', 'book-open', 120),
  ('Pets & Animals', 'pets-animals', 'paw-print', 130),
  ('Hobbies & Collectibles', 'hobbies-collectibles', 'sparkles', 140),
  ('Business & Industrial', 'business-industrial', 'briefcase-business', 150),
  ('Food & Beverages', 'food-beverages', 'utensils', 160),
  ('Other', 'other', 'package', 170)
on conflict (slug) do update set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order, is_active = true;

insert into public.categories (parent_id, name, slug, icon, sort_order)
select c.id, x.name, x.slug, x.icon, x.sort_order
from public.categories c
join (values
  ('babies-kids', 'Baby clothing', 'baby-clothing', 'shirt', 10),
  ('babies-kids', 'Toys', 'toys', 'toy-brick', 20),
  ('babies-kids', 'Strollers', 'strollers', 'baby', 30),
  ('babies-kids', 'School items', 'school-items', 'book-open', 40),
  ('sports-fitness', 'Gym equipment', 'gym-equipment', 'dumbbell', 10),
  ('sports-fitness', 'Sportswear', 'sportswear', 'shirt', 20),
  ('sports-fitness', 'Outdoor gear', 'outdoor-gear', 'tent', 30),
  ('books-education', 'Books', 'books', 'book-open', 10),
  ('books-education', 'Courses', 'courses', 'graduation-cap', 20),
  ('books-education', 'School supplies', 'school-supplies', 'pencil', 30),
  ('pets-animals', 'Pets', 'pets', 'paw-print', 10),
  ('pets-animals', 'Pet supplies', 'pet-supplies', 'package', 20),
  ('pets-animals', 'Animal care', 'animal-care', 'heart-pulse', 30),
  ('hobbies-collectibles', 'Collectibles', 'collectibles', 'sparkles', 10),
  ('hobbies-collectibles', 'Musical instruments', 'musical-instruments', 'music', 20),
  ('hobbies-collectibles', 'Arts & crafts', 'arts-crafts', 'palette', 30),
  ('business-industrial', 'Machinery', 'machinery', 'cog', 10),
  ('business-industrial', 'Manufacturing equipment', 'manufacturing-equipment', 'factory', 20),
  ('business-industrial', 'Office equipment', 'office-equipment', 'briefcase', 30),
  ('business-industrial', 'Restaurant equipment', 'restaurant-equipment', 'utensils', 40),
  ('business-industrial', 'Wholesale goods', 'wholesale-goods', 'shopping-basket', 50),
  ('business-industrial', 'Industrial supplies', 'industrial-supplies', 'package', 60),
  ('food-beverages', 'Food', 'food', 'utensils', 10),
  ('food-beverages', 'Grains', 'grains', 'wheat', 20),
  ('food-beverages', 'Fresh produce', 'fresh-produce', 'sprout', 30),
  ('food-beverages', 'Processed food', 'processed-food', 'package', 40),
  ('food-beverages', 'Bakery', 'bakery', 'cake', 50),
  ('food-beverages', 'Catering', 'catering', 'utensils', 60),
  ('other', 'Other products', 'other-products', 'package', 10),
  ('other', 'Other services', 'other-services', 'wrench', 20)
) as x(parent_slug, name, slug, icon, sort_order) on c.slug = x.parent_slug
on conflict (slug) do update set parent_id = excluded.parent_id, name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order, is_active = true;


-- ================================================================
-- SOURCE: supabase/migrations/20260911200000_force_public_marketplace_media.sql
-- ================================================================

-- Bese26 public media rollout.
-- Listing photos, profile avatars, and business logos are public marketplace
-- content. Identity/KYC documents and chat media remain private.

update storage.buckets
set public = true
where id in ('listing-media', 'avatars');

drop policy if exists public_marketplace_media_read on storage.objects;
create policy public_marketplace_media_read
on storage.objects
for select
to anon, authenticated
using (bucket_id in ('listing-media', 'avatars'));


-- ================================================================
-- SOURCE: supabase/migrations/20260911201500_create_public_marketplace_buckets.sql
-- ================================================================

-- Repair production environments where the marketplace tables exist but the
-- original storage bucket creation block was not rolled out.

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'listing-media',
    'listing-media',
    true,
    10485760,
    array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']::text[]
  )
  on conflict (id) do update
    set public = true,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg','image/png','image/webp']::text[]
  )
  on conflict (id) do update
    set public = true,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
end;
$$;

drop policy if exists public_marketplace_media_read on storage.objects;
create policy public_marketplace_media_read
on storage.objects
for select
to anon, authenticated
using (bucket_id in ('listing-media', 'avatars'));


-- ================================================================
-- SOURCE: supabase/migrations/20260911202500_complete_storage_policy_rollout.sql
-- ================================================================

-- Complete Bese26 Storage rollout.
-- Public: listing photos, profile avatars, and business logos.
-- Private: chat attachments and verification/KYC documents.

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'listing-media', 'listing-media', true, 10485760,
    ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'avatars', 'avatars', true, 5242880,
    ARRAY['image/jpeg','image/png','image/webp']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'chat-media', 'chat-media', false, 12000000,
    ARRAY['image/jpeg','image/png','image/webp','audio/webm','audio/ogg','audio/mpeg','application/pdf']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'verification-documents', 'verification-documents', false, 8000000,
    ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
END;
$$;

-- Public read is intentional only for marketplace photos and profile/business images.
DROP POLICY IF EXISTS public_marketplace_media_read ON storage.objects;
CREATE POLICY public_marketplace_media_read
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id IN ('listing-media', 'avatars'));

-- Listing photo writes remain owner-only.
DROP POLICY IF EXISTS listing_media_object_insert ON storage.objects;
CREATE POLICY listing_media_object_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-media' AND private.user_owns_listing_storage_path(name));

DROP POLICY IF EXISTS listing_media_object_update ON storage.objects;
CREATE POLICY listing_media_object_update
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'listing-media' AND owner_id = auth.uid()::text)
WITH CHECK (bucket_id = 'listing-media' AND owner_id = auth.uid()::text);

DROP POLICY IF EXISTS listing_media_object_delete ON storage.objects;
CREATE POLICY listing_media_object_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'listing-media' AND owner_id = auth.uid()::text);

-- Profile and business image writes remain owner-only.
DROP POLICY IF EXISTS avatar_object_insert ON storage.objects;
CREATE POLICY avatar_object_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatar_object_update ON storage.objects;
CREATE POLICY avatar_object_update
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND owner_id = auth.uid()::text);

DROP POLICY IF EXISTS avatar_object_delete ON storage.objects;
CREATE POLICY avatar_object_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text);

-- Chat attachments are private and visible only to conversation participants.
DROP POLICY IF EXISTS chat_media_object_insert ON storage.objects;
CREATE POLICY chat_media_object_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS chat_media_object_read ON storage.objects;
CREATE POLICY chat_media_object_read
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS chat_media_object_delete ON storage.objects;
CREATE POLICY chat_media_object_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- KYC documents remain private: owner and trusted moderators only.
DROP POLICY IF EXISTS verification_docs_insert ON storage.objects;
CREATE POLICY verification_docs_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS verification_docs_select ON storage.objects;
CREATE POLICY verification_docs_select
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS verification_docs_admin_select ON storage.objects;
CREATE POLICY verification_docs_admin_select
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verification-documents' AND public.current_user_can_moderate());


-- ================================================================
-- SOURCE: supabase/migrations/20260911210000_expand_global_marketplace_categories.sql
-- ================================================================

-- Expand Bese26 into a general marketplace without changing the listing form.
-- Existing category rows are preserved; these rows add missing global inventory types.

INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Arduino & IoT', 'arduino-iot', 'cpu', 25),
  ('Computers & Accessories', 'computers-accessories', 'laptop', 27),
  ('Cameras & Photography', 'cameras-photography', 'camera', 29),
  ('Industrial & Scientific', 'industrial-scientific', 'factory', 115),
  ('Construction & Building', 'construction-building', 'hard-hat', 117),
  ('Renewable Energy', 'renewable-energy', 'sun', 119),
  ('Office & Stationery', 'office-stationery', 'briefcase', 145),
  ('Digital Products', 'digital-products', 'globe', 147),
  ('Travel & Luggage', 'travel-luggage', 'luggage', 149),
  ('Events & Entertainment', 'events-entertainment', 'ticket', 151),
  ('Services', 'services', 'wrench', 153),
  ('Other', 'other', 'package', 999)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.categories (parent_id, name, slug, icon, sort_order)
SELECT c.id, x.name, x.slug, x.icon, x.sort_order
FROM public.categories c
JOIN (VALUES
  ('arduino-iot', 'Arduino boards', 'cpu', 'arduino-boards', 10),
  ('arduino-iot', 'ESP32', 'cpu', 'esp32', 20),
  ('arduino-iot', 'ESP8266', 'cpu', 'esp8266', 30),
  ('arduino-iot', 'Raspberry Pi', 'cpu', 'raspberry-pi', 40),
  ('arduino-iot', 'Microcontrollers', 'cpu', 'microcontrollers', 50),
  ('arduino-iot', 'Sensors', 'activity', 'sensors', 60),
  ('arduino-iot', 'Modules', 'layers', 'modules', 70),
  ('arduino-iot', 'Electronic components', 'zap', 'electronic-components', 80),
  ('arduino-iot', 'Development boards', 'circuit-board', 'development-boards', 90),
  ('arduino-iot', 'Robotics', 'bot', 'robotics', 100),
  ('arduino-iot', 'Drones', 'plane', 'drones', 110),
  ('arduino-iot', 'IoT kits', 'wifi', 'iot-kits', 120),
  ('arduino-iot', 'Automation', 'settings', 'automation', 130),
  ('arduino-iot', '3D printing', 'printer', '3d-printing', 140),
  ('arduino-iot', 'Soldering & tools', 'wrench', 'soldering-tools', 150),
  ('arduino-iot', 'Cables & connectors', 'cable', 'cables-connectors', 160),
  ('computers-accessories', 'Desktops', 'monitor', 'desktops', 10),
  ('computers-accessories', 'Laptops', 'laptop', 'laptops', 20),
  ('computers-accessories', 'Monitors', 'monitor', 'monitors', 30),
  ('computers-accessories', 'Keyboards', 'keyboard', 'keyboards', 40),
  ('computers-accessories', 'Mice', 'mouse', 'mice', 50),
  ('computers-accessories', 'Hard drives', 'hard-drive', 'hard-drives', 60),
  ('computers-accessories', 'SSD', 'hard-drive', 'ssd', 70),
  ('computers-accessories', 'RAM', 'memory-stick', 'ram', 80),
  ('computers-accessories', 'Graphics cards', 'gpu', 'graphics-cards', 90),
  ('cameras-photography', 'Digital cameras', 'camera', 'digital-cameras', 10),
  ('cameras-photography', 'Lenses', 'camera', 'lenses', 20),
  ('cameras-photography', 'Tripods', 'camera', 'tripods', 30),
  ('cameras-photography', 'Lighting', 'sun', 'lighting', 40),
  ('cameras-photography', 'Camcorders', 'video', 'camcorders', 50),
  ('industrial-scientific', 'Laboratory equipment', 'flask', 'laboratory-equipment', 10),
  ('industrial-scientific', 'Measuring instruments', 'ruler', 'measuring-instruments', 20),
  ('industrial-scientific', 'Safety equipment', 'shield', 'safety-equipment', 30),
  ('industrial-scientific', 'Electrical equipment', 'zap', 'electrical-equipment', 40),
  ('construction-building', 'Building materials', 'brick-wall', 'building-materials', 10),
  ('construction-building', 'Plumbing', 'droplets', 'plumbing', 20),
  ('construction-building', 'Electrical supplies', 'zap', 'electrical-supplies', 30),
  ('construction-building', 'Power tools', 'wrench', 'power-tools', 40),
  ('renewable-energy', 'Solar panels', 'sun', 'solar-panels', 10),
  ('renewable-energy', 'Inverters', 'zap', 'inverters', 20),
  ('renewable-energy', 'Batteries', 'battery', 'batteries', 30),
  ('renewable-energy', 'Charge controllers', 'battery-charging', 'charge-controllers', 40),
  ('office-stationery', 'Office furniture', 'armchair', 'office-furniture', 10),
  ('office-stationery', 'Stationery', 'pencil', 'stationery', 20),
  ('office-stationery', 'Printers & scanners', 'printer', 'printers-scanners', 30),
  ('digital-products', 'Software', 'code', 'software', 10),
  ('digital-products', 'Templates', 'file', 'templates', 20),
  ('digital-products', 'Digital courses', 'book-open', 'digital-courses', 30),
  ('travel-luggage', 'Luggage', 'luggage', 'luggage', 10),
  ('travel-luggage', 'Travel bags', 'briefcase', 'travel-bags', 20),
  ('travel-luggage', 'Camping equipment', 'tent', 'camping-equipment', 30),
  ('events-entertainment', 'Event equipment', 'calendar', 'event-equipment', 10),
  ('events-entertainment', 'Party supplies', 'sparkles', 'party-supplies', 20),
  ('events-entertainment', 'Music & DJ', 'music', 'music-dj', 30),
  ('services', 'Repairs', 'wrench', 'repairs', 10),
  ('services', 'Installation', 'settings', 'installation', 20),
  ('services', 'Delivery', 'truck', 'delivery', 30),
  ('services', 'Cleaning', 'spray-can', 'cleaning', 40),
  ('services', 'Design', 'pen-tool', 'design', 50),
  ('services', 'Consulting', 'messages-square', 'consulting', 60),
  ('services', 'Other services', 'package', 'other-services', 99),
  ('other', 'Other products', 'package', 'other-products', 10),
  ('other', 'Other services', 'wrench', 'other-services-global', 20)
) AS x(parent_slug, name, icon, slug, sort_order) ON c.slug = x.parent_slug
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Fields needed for hardware listings; all are optional so existing flows remain unchanged.
INSERT INTO public.category_fields (category_id, field_key, label, field_type, options, sort_order)
SELECT c.id, x.field_key, x.label, x.field_type, x.options::jsonb, x.sort_order
FROM public.categories c
JOIN (VALUES
  ('arduino-iot', 'board_type', 'Board / device', 'text', '[]', 10),
  ('arduino-iot', 'chip', 'Chip / module', 'text', '[]', 20),
  ('arduino-iot', 'voltage', 'Voltage', 'text', '[]', 30),
  ('arduino-iot', 'connectivity', 'Connectivity', 'select', '["Wi-Fi","Bluetooth","LoRa","GSM","USB","None"]', 40),
  ('computers-accessories', 'brand', 'Brand', 'text', '[]', 10),
  ('computers-accessories', 'model', 'Model', 'text', '[]', 20),
  ('computers-accessories', 'processor', 'Processor', 'text', '[]', 30),
  ('computers-accessories', 'ram', 'RAM', 'text', '[]', 40),
  ('computers-accessories', 'storage', 'Storage', 'text', '[]', 50),
  ('cameras-photography', 'brand', 'Brand', 'text', '[]', 10),
  ('cameras-photography', 'model', 'Model', 'text', '[]', 20),
  ('cameras-photography', 'resolution', 'Resolution', 'text', '[]', 30)
) AS x(category_slug, field_key, label, field_type, options, sort_order) ON c.slug = x.category_slug
ON CONFLICT (category_id, field_key) DO UPDATE SET
  label = EXCLUDED.label,
  field_type = EXCLUDED.field_type,
  options = EXCLUDED.options,
  sort_order = EXCLUDED.sort_order,
  is_active = true;


-- ================================================================
-- SOURCE: supabase/migrations/20260911210000_expand_marketplace_categories.sql
-- ================================================================

-- Expand Bese26 marketplace categories without changing existing tables or listing data.
-- Existing slugs are upserted; new parents and children are added idempotently.

insert into public.categories (name, slug, icon, sort_order, is_active) values
  ('Computers & Accessories', 'computers-accessories', 'laptop', 100, true),
  ('Robotics & Electronics', 'robotics-electronics', 'cpu', 110, true),
  ('Solar & Power', 'solar-power', 'sun', 120, true),
  ('Home Appliances', 'home-appliances', 'washing-machine', 130, true),
  ('Tools & Hardware', 'tools-hardware', 'hammer', 140, true),
  ('Construction & Building', 'construction-building', 'building-2', 150, true),
  ('Industrial & Business Equipment', 'industrial-business-equipment', 'factory', 160, true),
  ('Safety & Security', 'safety-security', 'shield-check', 170, true),
  ('Baby & Kids', 'baby-kids', 'baby', 180, true),
  ('Sports & Fitness', 'sports-fitness', 'dumbbell', 190, true),
  ('Food & Groceries', 'food-groceries', 'shopping-basket', 200, true),
  ('Books, Media & Games', 'books-media-games', 'book-open', 210, true),
  ('Office & School', 'office-school', 'notebook-tabs', 220, true),
  ('Musical Instruments', 'musical-instruments', 'music-2', 230, true),
  ('Travel & Luggage', 'travel-luggage', 'luggage', 240, true),
  ('Pets & Animals', 'pets-animals', 'paw-print', 250, true),
  ('Spare Parts & Accessories', 'spare-parts-accessories', 'settings-2', 260, true),
  ('Other', 'other', 'ellipsis', 9999, true)
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.categories (parent_id, name, slug, icon, sort_order, is_active)
select c.id, x.name, x.slug, x.icon, x.sort_order, true
from public.categories c
join (values
  ('phones-tablets', 'Phone Accessories', 'cable', 'phone-accessories', 30),
  ('phones-tablets', 'Wearables & Smartwatches', 'watch', 'wearables-smartwatches', 40),
  ('phones-tablets', 'Mobile Network Devices', 'router', 'mobile-network-devices', 50),
  ('electronics', 'Cameras & Photography', 'camera', 'cameras-photography', 30),
  ('electronics', 'Game Consoles', 'gamepad-2', 'game-consoles', 40),
  ('electronics', 'Printers & Scanners', 'printer', 'printers-scanners', 50),
  ('electronics', 'Computer Monitors', 'monitor', 'computer-monitors', 60),
  ('computers-accessories', 'Desktop Computers', 'monitor', 'desktop-computers', 10),
  ('computers-accessories', 'Computer Accessories', 'keyboard', 'computer-accessories', 20),
  ('computers-accessories', 'Computer Parts', 'microchip', 'computer-parts', 30),
  ('computers-accessories', 'Networking Equipment', 'router', 'networking-equipment', 40),
  ('robotics-electronics', 'Arduino & Microcontrollers', 'cpu', 'arduino-microcontrollers', 10),
  ('robotics-electronics', 'Raspberry Pi & SBCs', 'cpu', 'raspberry-pi-sbcs', 20),
  ('robotics-electronics', 'Sensors & Modules', 'activity', 'sensors-modules', 30),
  ('robotics-electronics', 'Motors & Servos', 'rotate-cw', 'motors-servos', 40),
  ('robotics-electronics', 'Robotics Kits', 'bot', 'robotics-kits', 50),
  ('robotics-electronics', 'IoT & Automation', 'wifi', 'iot-automation', 60),
  ('robotics-electronics', 'PCBs & Electronic Components', 'circuit-board', 'pcbs-electronic-components', 70),
  ('robotics-electronics', '3D Printing & CNC', 'printer', '3d-printing-cnc', 80),
  ('robotics-electronics', 'Drones & UAVs', 'drone', 'drones-uavs', 90),
  ('solar-power', 'Solar Panels', 'sun', 'solar-panels', 10),
  ('solar-power', 'Inverters', 'zap', 'inverters', 20),
  ('solar-power', 'Batteries & Storage', 'battery-charging', 'batteries-storage', 30),
  ('solar-power', 'Charge Controllers', 'gauge', 'charge-controllers', 40),
  ('solar-power', 'Generators', 'fuel', 'generators', 50),
  ('solar-power', 'UPS & Power Stations', 'battery', 'ups-power-stations', 60),
  ('solar-power', 'Solar Cables & Accessories', 'cable', 'solar-cables-accessories', 70),
  ('home-appliances', 'Refrigerators & Freezers', 'refrigerator', 'refrigerators-freezers', 10),
  ('home-appliances', 'Washing Machines', 'washing-machine', 'washing-machines', 20),
  ('home-appliances', 'Cookers & Kitchen Appliances', 'chef-hat', 'cookers-kitchen-appliances', 30),
  ('home-appliances', 'Fans & Air Conditioners', 'fan', 'fans-air-conditioners', 40),
  ('home-appliances', 'Small Home Appliances', 'coffee', 'small-home-appliances', 50),
  ('tools-hardware', 'Power Tools', 'drill', 'power-tools', 10),
  ('tools-hardware', 'Hand Tools', 'wrench', 'hand-tools', 20),
  ('tools-hardware', 'Plumbing Tools & Supplies', 'pipette', 'plumbing-tools-supplies', 30),
  ('tools-hardware', 'Electrical Tools & Supplies', 'plug', 'electrical-tools-supplies', 40),
  ('construction-building', 'Building Materials', 'bricks', 'building-materials', 10),
  ('construction-building', 'Doors, Windows & Roofing', 'door-open', 'doors-windows-roofing', 20),
  ('construction-building', 'Paints & Finishing', 'paint-bucket', 'paints-finishing', 30),
  ('construction-building', 'Plumbing & Water Systems', 'pipette', 'plumbing-water-systems', 40),
  ('industrial-business-equipment', 'Restaurant & Catering Equipment', 'utensils', 'restaurant-catering-equipment', 10),
  ('industrial-business-equipment', 'Farm & Processing Equipment', 'factory', 'farm-processing-equipment', 20),
  ('industrial-business-equipment', 'Printing & Packaging Equipment', 'printer', 'printing-packaging-equipment', 30),
  ('industrial-business-equipment', 'Generators & Industrial Power', 'zap', 'generators-industrial-power', 40),
  ('safety-security', 'CCTV & Surveillance', 'cctv', 'cctv-surveillance', 10),
  ('safety-security', 'Access Control & Alarms', 'lock-keyhole', 'access-control-alarms', 20),
  ('safety-security', 'Fire Safety Equipment', 'flame', 'fire-safety-equipment', 30),
  ('baby-kids', 'Baby Clothing & Accessories', 'baby', 'baby-clothing-accessories', 10),
  ('baby-kids', 'Toys & Games', 'toy-brick', 'toys-games', 20),
  ('baby-kids', 'School Supplies for Kids', 'pencil', 'school-supplies-kids', 30),
  ('sports-fitness', 'Gym & Fitness Equipment', 'dumbbell', 'gym-fitness-equipment', 10),
  ('sports-fitness', 'Sportswear & Shoes', 'footprints', 'sportswear-shoes', 20),
  ('sports-fitness', 'Outdoor & Camping', 'tent-tree', 'outdoor-camping', 30),
  ('food-groceries', 'Grains & Staple Foods', 'wheat', 'grains-staple-foods', 10),
  ('food-groceries', 'Drinks & Beverages', 'cup-soda', 'drinks-beverages', 20),
  ('food-groceries', 'Packaged Foods', 'package', 'packaged-foods', 30),
  ('books-media-games', 'Books & Textbooks', 'book-open', 'books-textbooks', 10),
  ('books-media-games', 'Video Games & Accessories', 'gamepad-2', 'video-games-accessories', 20),
  ('books-media-games', 'Movies & Music', 'disc-3', 'movies-music', 30),
  ('office-school', 'Office Furniture', 'briefcase-business', 'office-furniture', 10),
  ('office-school', 'Stationery & Supplies', 'notebook-pen', 'stationery-supplies', 20),
  ('office-school', 'School Textbooks', 'graduation-cap', 'school-textbooks', 30),
  ('musical-instruments', 'Keyboards & Pianos', 'piano', 'keyboards-pianos', 10),
  ('musical-instruments', 'Guitars & String Instruments', 'guitar', 'guitars-string-instruments', 20),
  ('musical-instruments', 'Drums & Percussion', 'drum', 'drums-percussion', 30),
  ('travel-luggage', 'Travel Bags & Suitcases', 'luggage', 'travel-bags-suitcases', 10),
  ('travel-luggage', 'Travel Accessories', 'plane', 'travel-accessories', 20),
  ('pets-animals', 'Pet Supplies', 'bone', 'pet-supplies', 10),
  ('pets-animals', 'Livestock & Poultry', 'bird', 'livestock-poultry', 20),
  ('spare-parts-accessories', 'Vehicle Spare Parts', 'car-front', 'vehicle-spare-parts', 10),
  ('spare-parts-accessories', 'Phone & Computer Parts', 'microchip', 'phone-computer-parts', 20),
  ('spare-parts-accessories', 'Machinery Spare Parts', 'settings-2', 'machinery-spare-parts', 30)
) as x(parent_slug, name, icon, slug, sort_order) on c.slug = x.parent_slug
on conflict (slug) do update set
  parent_id = excluded.parent_id,
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

-- Keep the catch-all category at the end of every category selector.
update public.categories set sort_order = 9999, is_active = true where slug = 'other';


-- ================================================================
-- SOURCE: supabase/migrations/20260911211000_add_other_subcategory_to_all_categories.sql
-- ================================================================

-- Add a fallback "Other" subcategory under every top-level category.
-- The global "Other" category remains a top-level catch-all at the end.

insert into public.categories (parent_id, name, slug, icon, sort_order, is_active)
select c.id, 'Other', c.slug || '-other', 'ellipsis', 999, true
from public.categories c
where c.parent_id is null
  and c.slug <> 'other'
on conflict (slug) do update set
  parent_id = excluded.parent_id,
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

update public.categories
set sort_order = 9999, is_active = true
where parent_id is null and slug = 'other';


-- ================================================================
-- SOURCE: supabase/migrations/20260912110000_listing_contact_actions.sql
-- ================================================================

-- Expose only the contact methods that the seller enabled for this published listing.
-- The RPC avoids exposing private profile contact rows through a public table select.
create or replace function public.get_listing_contact(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'phone', case
      when l.contact_preference in ('call', 'chat_call') then
        case when l.published_as_type = 'business' or l.business_profile_id is not null then nullif(bp.phone, '') else case when coalesce(pc.allow_calls, false) then nullif(pc.phone, '') end end
      else null
    end,
    'whatsapp', case
      when l.contact_preference in ('whatsapp', 'chat_whatsapp', 'chat_call') then
        case when l.published_as_type = 'business' or l.business_profile_id is not null then nullif(bp.whatsapp, '') else case when coalesce(pc.allow_whatsapp, false) then nullif(coalesce(pc.whatsapp, pc.phone), '') end end
      else null
    end
  )
  into v_result
  from public.listings l
  left join public.profile_contacts pc on pc.profile_id = l.seller_id
  left join public.business_profiles bp on bp.profile_id = l.business_profile_id and bp.is_active = true
  where l.id = p_listing_id
    and ((l.status = 'active' and l.moderation_status = 'approved') or l.seller_id = auth.uid());

  return coalesce(v_result, jsonb_build_object('phone', null, 'whatsapp', null));
end;
$$;

revoke all on function public.get_listing_contact(uuid) from public;
grant execute on function public.get_listing_contact(uuid) to anon, authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260912153000_profile_global_currency.sql
-- ================================================================

-- Allow each seller to choose the currency used for their listings.
-- Existing NGN profiles and listings remain unchanged.
alter table public.profile_preferences
  drop constraint if exists profile_preferences_currency_check;

alter table public.profile_preferences
  alter column currency set default 'NGN';

alter table public.profile_preferences
  add constraint profile_preferences_currency_check
  check (currency is null or currency ~ '^[A-Z]{3}$');

alter table public.listings
  drop constraint if exists listings_currency_check;

alter table public.listings
  add constraint listings_currency_check
  check (currency is null or currency ~ '^[A-Z]{3}$');


-- ================================================================
-- SOURCE: supabase/migrations/20260912170000_notify_followers_on_listing_publish.sql
-- ================================================================

-- Notify followers when a seller's listing becomes publicly available.
-- This keeps the following experience automatic: follow a seller once, then
-- receive a notification whenever that seller publishes a new approved item.
create or replace function public.notify_followers_on_listing_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active'
     and new.moderation_status = 'approved'
     and (
       tg_op = 'INSERT'
       or old.status is distinct from 'active'
       or old.moderation_status is distinct from 'approved'
     ) then
    insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
    select
      follows.follower_id,
      new.seller_id,
      'new_followed_listing',
      'A seller you follow posted a new item',
      new.title,
      jsonb_build_object('listing_id', new.id, 'seller_id', new.seller_id)
    from public.profile_follows as follows
    where follows.following_id = new.seller_id
      and follows.follower_id <> new.seller_id;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_notify_followers_after_publish on public.listings;
create trigger listings_notify_followers_after_publish
after insert or update of status, moderation_status on public.listings
for each row execute function public.notify_followers_on_listing_publish();


-- ================================================================
-- SOURCE: supabase/migrations/20260912171000_admin_ad_assets_storage.sql
-- ================================================================

-- Public banner assets are uploaded only by moderators/admins and read by visitors.
insert into storage.buckets (id, name, public)
values ('ad-assets', 'ad-assets', true)
on conflict (id) do update set public = true;

drop policy if exists ad_assets_public_read on storage.objects;
create policy ad_assets_public_read
on storage.objects for select
to public
using (bucket_id = 'ad-assets');

drop policy if exists ad_assets_admin_insert on storage.objects;
create policy ad_assets_admin_insert
on storage.objects for insert
to authenticated
with check (bucket_id = 'ad-assets' and public.current_user_can_moderate());

drop policy if exists ad_assets_admin_update on storage.objects;
create policy ad_assets_admin_update
on storage.objects for update
to authenticated
using (bucket_id = 'ad-assets' and public.current_user_can_moderate())
with check (bucket_id = 'ad-assets' and public.current_user_can_moderate());

drop policy if exists ad_assets_admin_delete on storage.objects;
create policy ad_assets_admin_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'ad-assets' and public.current_user_can_moderate());


-- ================================================================
-- SOURCE: supabase/migrations/20260912200000_follow_and_save_notifications.sql
-- ================================================================

-- Bese26: notify sellers about new followers and saved listings.
-- Both functions run as security definer so the event creator does not need
-- direct INSERT access to the recipient's notifications.

create or replace function public.notify_on_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
begin
  if new.follower_id = new.following_id then
    return new;
  end if;

  select coalesce(nullif(trim(display_name), ''), 'A Bese26 user')
    into v_actor_name
    from public.profiles
   where id = new.follower_id;

  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (
    new.following_id,
    new.follower_id,
    'new_follower',
    'You have a new follower',
    coalesce(v_actor_name, 'A Bese26 user') || ' started following you.',
    jsonb_build_object('follower_id', new.follower_id)
  );

  return new;
end;
$$;

drop trigger if exists profile_follows_notify_new_follower on public.profile_follows;
create trigger profile_follows_notify_new_follower
after insert on public.profile_follows
for each row execute function public.notify_on_new_follower();

create or replace function public.notify_on_listing_saved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_listing_title text;
  v_actor_name text;
begin
  select seller_id, title
    into v_seller_id, v_listing_title
    from public.listings
   where id = new.listing_id;

  if v_seller_id is null or v_seller_id = new.user_id then
    return new;
  end if;

  select coalesce(nullif(trim(display_name), ''), 'A buyer')
    into v_actor_name
    from public.profiles
   where id = new.user_id;

  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (
    v_seller_id,
    new.user_id,
    'listing_saved',
    'Someone saved your listing',
    coalesce(v_actor_name, 'Someone') || ' saved “' || coalesce(v_listing_title, 'your listing') || '”.',
    jsonb_build_object('listing_id', new.listing_id, 'seller_id', v_seller_id)
  );

  return new;
end;
$$;

drop trigger if exists listing_favorites_notify_listing_saved on public.listing_favorites;
create trigger listing_favorites_notify_listing_saved
after insert on public.listing_favorites
for each row execute function public.notify_on_listing_saved();

-- Keep notifications available to the existing Realtime frontend.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
         from pg_publication_rel pr
         join pg_class c on c.oid = pr.prrelid
         join pg_namespace n on n.oid = c.relnamespace
         join pg_publication p on p.oid = pr.pubpubid
        where p.pubname = 'supabase_realtime'
          and n.nspname = 'public'
          and c.relname = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

revoke all on function public.notify_on_new_follower() from public, anon;
revoke all on function public.notify_on_listing_saved() from public, anon;
grant execute on function public.notify_on_new_follower() to authenticated;
grant execute on function public.notify_on_listing_saved() to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260913001000_image_only_ad_campaigns.sql
-- ================================================================

-- Image-first campaign banners. When enabled, the uploaded artwork is rendered as the full campaign creative.
alter table public.ad_campaigns
  add column if not exists image_only boolean not null default false;

-- Existing advertiser artwork should use the image-first renderer too.
update public.ad_campaigns
set image_only = true
where image_url is not null;

comment on column public.ad_campaigns.image_only is 'Render the uploaded campaign artwork as the complete creative without generated text overlays.';

notify pgrst, 'reload schema';


-- ================================================================
-- SOURCE: supabase/migrations/20260913002000_add_image_only_to_listings.sql
-- ================================================================

-- Bese26: support image-only listing rules in production.
-- Existing listings remain valid and keep the previous behavior.
alter table public.listings
  add column if not exists image_only boolean not null default false;

comment on column public.listings.image_only is
  'When true, the listing must use image media only; false preserves the existing listing behavior.';


-- ================================================================
-- SOURCE: supabase/migrations/20260913003000_fix_ad_assets_permission.sql
-- ================================================================

-- Storage policies call this public wrapper. It must run as the function owner
-- so authenticated admins do not need direct schema usage on private.
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

-- Reassert the storage policies after the wrapper fix.
drop policy if exists ad_assets_admin_insert on storage.objects;
create policy ad_assets_admin_insert
on storage.objects for insert
to authenticated
with check (bucket_id = 'ad-assets' and public.current_user_can_moderate());

drop policy if exists ad_assets_admin_update on storage.objects;
create policy ad_assets_admin_update
on storage.objects for update
to authenticated
using (bucket_id = 'ad-assets' and public.current_user_can_moderate())
with check (bucket_id = 'ad-assets' and public.current_user_can_moderate());

drop policy if exists ad_assets_admin_delete on storage.objects;
create policy ad_assets_admin_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'ad-assets' and public.current_user_can_moderate());


-- ================================================================
-- SOURCE: supabase/migrations/20260913004000_campaign_creative_dimensions.sql
-- ================================================================

-- Preserve each advertiser's intended creative ratio for proportional Home rendering.
alter table public.ad_campaigns
  add column if not exists creative_width integer not null default 1200,
  add column if not exists creative_height integer not null default 1200;

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_creative_width_check,
  drop constraint if exists ad_campaigns_creative_height_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_creative_width_check check (creative_width between 320 and 4000),
  add constraint ad_campaigns_creative_height_check check (creative_height between 320 and 4000);

notify pgrst, 'reload schema';


-- ================================================================
-- SOURCE: supabase/migrations/20260913005000_standardize_campaign_banner_size.sql
-- ================================================================

-- One universal advertiser creative for every campaign placement.
update public.ad_campaigns
set creative_width = 1600,
    creative_height = 500;

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_creative_width_check,
  drop constraint if exists ad_campaigns_creative_height_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_creative_width_check check (creative_width = 1600),
  add constraint ad_campaigns_creative_height_check check (creative_height = 500);

notify pgrst, 'reload schema';


-- ================================================================
-- SOURCE: supabase/migrations/20260913006000_admin_team_permissions.sql
-- ================================================================

-- Owner-controlled delegated admin team.
create table if not exists public.admin_team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  permissions text[] not null default '{}',
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_team_email_check check (position('@' in email) > 1),
  constraint admin_team_permissions_check check (permissions <@ array['listings','advertising','payments','verification','users','reports','support','businesses']::text[])
);
create index if not exists admin_team_members_active_idx on public.admin_team_members(active);
alter table public.admin_team_members enable row level security;

drop policy if exists admin_team_owner_only on public.admin_team_members;
create policy admin_team_owner_only on public.admin_team_members for all to authenticated using (private.is_bese26_owner_admin()) with check (private.is_bese26_owner_admin());

create or replace function public.admin_team_list()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not private.is_bese26_owner_admin() then raise exception 'OWNER_ADMIN_REQUIRED'; end if;
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from (select id,user_id,email,permissions,active,created_at,updated_at from public.admin_team_members) t), '[]'::jsonb);
end; $$;

create or replace function public.admin_team_add(p_email text, p_permissions text[])
returns public.admin_team_members language plpgsql security definer set search_path = public as $$
declare v_user_id uuid; v_row public.admin_team_members; v_email text := lower(trim(p_email));
begin
  if not private.is_bese26_owner_admin() then raise exception 'OWNER_ADMIN_REQUIRED'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'INVALID_ADMIN_EMAIL'; end if;
  if coalesce(array_length(p_permissions,1),0) = 0 then raise exception 'SELECT_ADMIN_PERMISSION'; end if;
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  if v_user_id is null then raise exception 'ADMIN_EMAIL_MUST_REGISTER_FIRST'; end if;
  insert into public.admin_team_members(user_id,email,permissions,created_by) values (v_user_id,v_email,p_permissions,auth.uid())
    on conflict (user_id) do update set email=excluded.email,permissions=excluded.permissions,active=true,updated_at=timezone('utc',now()) returning * into v_row;
  return v_row;
end; $$;

create or replace function public.admin_team_update(p_user_id uuid, p_permissions text[], p_active boolean)
returns public.admin_team_members language plpgsql security definer set search_path = public as $$
declare v_row public.admin_team_members;
begin
  if not private.is_bese26_owner_admin() then raise exception 'OWNER_ADMIN_REQUIRED'; end if;
  if p_user_id = auth.uid() then raise exception 'OWNER_CANNOT_BE_DEACTIVATED'; end if;
  update public.admin_team_members set permissions=p_permissions,active=p_active,updated_at=timezone('utc',now()) where user_id=p_user_id returning * into v_row;
  if v_row.id is null then raise exception 'ADMIN_NOT_FOUND'; end if;
  return v_row;
end; $$;

create or replace function public.admin_team_remove(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.is_bese26_owner_admin() then raise exception 'OWNER_ADMIN_REQUIRED'; end if;
  if p_user_id = auth.uid() then raise exception 'OWNER_CANNOT_BE_REMOVED'; end if;
  delete from public.admin_team_members where user_id = p_user_id;
  return found;
end; $$;

revoke all on function public.admin_team_list() from public, anon;
revoke all on function public.admin_team_add(text,text[]) from public, anon;
revoke all on function public.admin_team_update(uuid,text[],boolean) from public, anon;
revoke all on function public.admin_team_remove(uuid) from public, anon;
grant execute on function public.admin_team_list() to authenticated;
grant execute on function public.admin_team_add(text,text[]) to authenticated;
grant execute on function public.admin_team_update(uuid,text[],boolean) to authenticated;
grant execute on function public.admin_team_remove(uuid) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260913180000_owner_admin_verified_unlimited.sql
-- ================================================================

-- Owner admin is a trusted Bese26 account: show the verified badge and do not consume free listing slots.
update public.profiles
set is_verified = true,
    updated_at = timezone('utc', now())
where id = (select id from auth.users where lower(email) = 'smbabanbaba@gmail.com' limit 1);

create or replace function public.create_listing_with_plan(
  p_category_id uuid,
  p_subcategory_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_currency text,
  p_pricing_type text,
  p_condition text,
  p_quantity integer,
  p_unit text,
  p_country text,
  p_state text,
  p_city text,
  p_delivery_options jsonb,
  p_contact_preference text,
  p_attributes jsonb,
  p_business_profile_id uuid default null,
  p_published_as_type text default 'personal'
)
returns setof public.listings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_paid boolean := false;
  v_used integer;
  v_business_id uuid := null;
  v_publish_type text := coalesce(nullif(trim(p_published_as_type), ''), 'personal');
  v_owner_admin boolean := false;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_owner_admin := private.is_bese26_owner_admin();
  if nullif(trim(p_title), '') is null then raise exception 'TITLE_REQUIRED'; end if;
  if char_length(trim(p_description)) < 5 then raise exception 'DESCRIPTION_TOO_SHORT'; end if;
  if p_price is null or p_price <= 0 then raise exception 'VALID_PRICE_REQUIRED'; end if;
  if nullif(trim(p_state), '') is null or nullif(trim(p_city), '') is null then raise exception 'LOCATION_REQUIRED'; end if;
  if v_publish_type not in ('personal', 'business') then raise exception 'INVALID_PUBLISH_IDENTITY'; end if;
  if v_publish_type = 'business' then
    if p_business_profile_id is null then raise exception 'BUSINESS_REQUIRED'; end if;
    select bp.profile_id into v_business_id
    from public.business_profiles bp
    where bp.profile_id = p_business_profile_id
      and bp.profile_id = v_user
      and bp.is_active = true;
    if v_business_id is null then raise exception 'BUSINESS_NOT_OWNED'; end if;
  end if;
  if not exists (select 1 from public.categories c where c.id = p_category_id and c.is_active) then raise exception 'CATEGORY_NOT_AVAILABLE'; end if;
  if p_subcategory_id is not null and not exists (select 1 from public.categories c where c.id = p_subcategory_id and c.parent_id = p_category_id and c.is_active) then raise exception 'SUBCATEGORY_NOT_AVAILABLE'; end if;
  select s.plan_key, s.status, s.current_period_end into v_plan, v_status, v_end
    from public.seller_subscriptions s where s.profile_id = v_user for update;
  v_paid := v_owner_admin or (v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free');
  if not v_owner_admin and not v_paid then
    insert into public.seller_post_usage (profile_id, free_posts_used) values (v_user, 1)
    on conflict (profile_id) do update set free_posts_used = public.seller_post_usage.free_posts_used + 1, updated_at = now()
      where public.seller_post_usage.free_posts_used < 3
    returning free_posts_used into v_used;
    if v_used is null then raise exception 'FREE_POST_LIMIT_REACHED'; end if;
  end if;
  return query insert into public.listings (
    seller_id, business_profile_id, published_as_type, category_id, subcategory_id,
    title, description, price, currency, pricing_type, condition, quantity, unit,
    country, state, city, delivery_options, contact_preference, attributes,
    status, moderation_status
  ) values (
    v_user, v_business_id, v_publish_type, p_category_id, p_subcategory_id,
    trim(p_title), trim(p_description), p_price,
    coalesce(nullif(trim(p_currency), ''), 'NGN'), coalesce(nullif(trim(p_pricing_type), ''), 'fixed'),
    nullif(trim(p_condition), ''), p_quantity, nullif(trim(p_unit), ''),
    coalesce(nullif(trim(p_country), ''), 'Nigeria'), trim(p_state), trim(p_city),
    case when jsonb_typeof(coalesce(p_delivery_options, '[]'::jsonb)) = 'array' then p_delivery_options else '[]'::jsonb end,
    coalesce(nullif(trim(p_contact_preference), ''), 'chat'), coalesce(p_attributes, '{}'::jsonb),
    'pending', 'pending'
  ) returning *;
end;
$$;

revoke all on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb, uuid, text
) from public, anon;
grant execute on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb, uuid, text
) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260914190000_nigeria_only_marketplace.sql
-- ================================================================

-- Bese26 is a Nigeria-only marketplace.
-- Run this migration in the Supabase SQL Editor for the production project.

update public.profiles set country = 'Nigeria' where country is distinct from 'Nigeria';
update public.business_profiles set country = 'Nigeria' where country is distinct from 'Nigeria';
update public.listings set country = 'Nigeria', currency = 'NGN'
where country is distinct from 'Nigeria' or currency is distinct from 'NGN';
update public.profile_preferences set currency = 'NGN', number_format = 'en-NG'
where currency is distinct from 'NGN' or number_format is distinct from 'en-NG';

create or replace function public.enforce_bese26_nigeria_only()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'profiles' then
    new.country := 'Nigeria';
  elsif tg_table_name = 'business_profiles' then
    new.country := 'Nigeria';
  elsif tg_table_name = 'listings' then
    new.country := 'Nigeria';
    new.currency := 'NGN';
  elsif tg_table_name = 'profile_preferences' then
    new.currency := 'NGN';
    new.number_format := 'en-NG';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_nigeria_only on public.profiles;
create trigger profiles_nigeria_only
before insert or update on public.profiles
for each row execute function public.enforce_bese26_nigeria_only();

drop trigger if exists business_profiles_nigeria_only on public.business_profiles;
create trigger business_profiles_nigeria_only
before insert or update on public.business_profiles
for each row execute function public.enforce_bese26_nigeria_only();

drop trigger if exists listings_nigeria_only on public.listings;
create trigger listings_nigeria_only
before insert or update on public.listings
for each row execute function public.enforce_bese26_nigeria_only();

drop trigger if exists profile_preferences_nigeria_only on public.profile_preferences;
create trigger profile_preferences_nigeria_only
before insert or update on public.profile_preferences
for each row execute function public.enforce_bese26_nigeria_only();


-- ================================================================
-- SOURCE: supabase/migrations/20260914192000_owner_admin_unlimited_entitlements.sql
-- ================================================================

-- Owner admin privileges for Bese26.
-- The owner is identified by private.is_bese26_owner_admin(), not by a frontend flag.
-- This keeps unlimited access server-side and prevents ordinary users from receiving it.

update public.profiles
set is_verified = true,
    updated_at = timezone('utc', now())
where id = (
  select id from auth.users
  where lower(email) = 'smbabanbaba@gmail.com'
  limit 1
);

create or replace function public.enforce_bese26_owner_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from auth.users
    where id = new.id and lower(email) = 'smbabanbaba@gmail.com'
  ) then
    new.is_verified := true;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_owner_verified on public.profiles;
create trigger profiles_owner_verified
before insert or update on public.profiles
for each row execute function public.enforce_bese26_owner_verified();

create or replace function public.get_seller_entitlement()
returns table (
  plan_key text, subscription_status text, is_paid boolean, free_posts_limit integer,
  free_posts_used integer, free_posts_remaining integer, listing_limit integer,
  current_period_end timestamptz, boost_credits_limit integer, boost_credits_used integer,
  boost_credits_remaining integer, verification_eligible boolean
)
language plpgsql security definer set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_used integer := 0;
  v_boost record;
  v_owner boolean := false;
  v_unlimited integer := 2147483647;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_owner := private.is_bese26_owner_admin();
  if v_owner then
    return query select 'owner_admin', 'active', true, v_unlimited, 0, v_unlimited, v_unlimited,
      null::timestamptz, v_unlimited, 0, v_unlimited, true;
    return;
  end if;
  select s.plan_key, s.status, s.current_period_end into v_plan, v_status, v_end
  from public.seller_subscriptions s where s.profile_id = v_user;
  select u.free_posts_used into v_used from public.seller_post_usage u where u.profile_id = v_user;
  select * into v_boost from public.ensure_monthly_boost_credits(v_user);
  return query select v_plan, v_status,
    v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free',
    3, coalesce(v_used, 0), greatest(3 - coalesce(v_used, 0), 0),
    case v_plan when 'basic' then 15 when 'premium' then 35 when 'business' then 60 else 3 end,
    v_end, coalesce(v_boost.credits_granted, 0), coalesce(v_boost.credits_used, 0),
    coalesce(v_boost.credits_remaining, 0), v_plan in ('premium', 'business') and v_status = 'active' and (v_end is null or v_end > now());
end;
$$;
revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;

create or replace function public.ensure_monthly_boost_credits(p_user uuid default auth.uid())
returns table (period_start date, plan_key text, credits_granted integer, credits_used integer, credits_remaining integer)
language plpgsql security definer set search_path = public, private
as $$
declare
  v_owner boolean := private.is_bese26_owner_admin();
  v_plan text := case when v_owner then 'owner_admin' else public.current_paid_plan(p_user) end;
  v_period date := date_trunc('month', timezone('utc', now()))::date;
  v_grant integer := case when v_owner then 2147483647 when v_plan = 'premium' then 5 when v_plan = 'business' then 10 else 0 end;
  v_row public.seller_monthly_boost_credits;
begin
  if p_user is null or auth.uid() is distinct from p_user and not public.current_user_can_moderate() then
    raise exception 'OWNER_REQUIRED';
  end if;
  insert into public.seller_monthly_boost_credits(profile_id, period_start, credits_granted)
  values (p_user, v_period, v_grant)
  on conflict (profile_id, period_start) do update
    set credits_granted = greatest(public.seller_monthly_boost_credits.credits_granted, excluded.credits_granted), updated_at = now()
  returning * into v_row;
  return query select v_row.period_start, coalesce(v_plan, 'free'), v_row.credits_granted, v_row.credits_used, greatest(v_row.credits_granted - v_row.credits_used, 0);
end;
$$;
revoke all on function public.ensure_monthly_boost_credits(uuid) from public, anon;
grant execute on function public.ensure_monthly_boost_credits(uuid) to authenticated;

create or replace function public.redeem_free_boost_credit(p_listing_id uuid)
returns public.listing_boosts
language plpgsql security definer set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_owner boolean := false;
  v_plan text;
  v_period date := date_trunc('month', timezone('utc', now()))::date;
  v_credits public.seller_monthly_boost_credits;
  v_listing public.listings;
  v_package public.boost_packages;
  v_boost public.listing_boosts;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_owner := private.is_bese26_owner_admin();
  v_plan := public.current_paid_plan(v_user);
  if not v_owner and v_plan is null then raise exception 'PAID_PLAN_REQUIRED_FOR_FREE_BOOST'; end if;
  select * into v_listing from public.listings where id = p_listing_id and seller_id = v_user and status = 'active' for update;
  if v_listing.id is null then raise exception 'ACTIVE_LISTING_REQUIRED'; end if;
  perform public.ensure_monthly_boost_credits(v_user);
  select * into v_credits from public.seller_monthly_boost_credits where profile_id = v_user and period_start = v_period for update;
  if not v_owner and v_credits.credits_used >= v_credits.credits_granted then raise exception 'NO_FREE_BOOST_CREDITS'; end if;
  select * into v_package from public.boost_packages where name = 'Included 3-day boost' and is_active and not is_public limit 1;
  if v_package.id is null then raise exception 'FREE_BOOST_PACKAGE_MISSING'; end if;
  insert into public.listing_boosts(listing_id, seller_id, package_id, status, starts_at, ends_at)
  values (p_listing_id, v_user, v_package.id, 'active', now(), now() + interval '3 days') returning * into v_boost;
  if not v_owner then
    update public.seller_monthly_boost_credits set credits_used = credits_used + 1, updated_at = now()
    where profile_id = v_user and period_start = v_period;
  end if;
  return v_boost;
end;
$$;
revoke all on function public.redeem_free_boost_credit(uuid) from public, anon;
grant execute on function public.redeem_free_boost_credit(uuid) to authenticated;

create or replace function public.enforce_paid_listing_limit()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare
  v_plan text;
  v_limit integer;
  v_count integer;
begin
  if new.status <> 'active' or private.is_bese26_owner_admin() then return new; end if;
  v_plan := public.current_active_plan(coalesce(new.seller_id, auth.uid()));
  v_limit := case v_plan when 'premium' then 35 when 'business' then 60 when 'basic' then 15 else 3 end;
  select count(*) into v_count from public.listings l where l.seller_id = new.seller_id and l.status = 'active' and l.id <> new.id;
  if v_count >= v_limit then raise exception 'ACTIVE_LISTING_LIMIT_REACHED'; end if;
  return new;
end;
$$;

drop trigger if exists listings_paid_limit_guard on public.listings;
create trigger listings_paid_limit_guard before insert or update of status on public.listings
for each row execute procedure public.enforce_paid_listing_limit();

create or replace function public.enforce_paid_verification_gate()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.user_id = auth.uid() and not private.is_bese26_owner_admin() and not public.current_user_can_moderate() and public.current_paid_plan(new.user_id) is null then
    raise exception 'PAID_PLAN_REQUIRED_FOR_VERIFICATION';
  end if;
  return new;
end;
$$;


-- ================================================================
-- SOURCE: supabase/migrations/20260915220000_owner_admin_listing_guard_bypass.sql
-- ================================================================

-- Owner admin listings must remain unlimited across every activation path,
-- including moderation approval (which updates status to active).
create or replace function public.enforce_paid_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_plan text;
  v_limit integer;
  v_count integer;
  v_owner_admin_seller boolean := false;
begin
  if new.status <> 'active' then
    return new;
  end if;

  -- The owner admin must be able to approve any pending listing, even when
  -- the seller has reached a normal plan cap.
  if private.is_bese26_owner_admin() then
    return new;
  end if;

  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = new.seller_id
      and lower(coalesce(u.email, '')) = 'smbabanbaba@gmail.com'
      and p.app_role = 'admin'
      and coalesce(p.admin_suspended, false) = false
  ) into v_owner_admin_seller;

  if v_owner_admin_seller then
    return new;
  end if;

  v_plan := public.current_active_plan(coalesce(new.seller_id, auth.uid()));
  v_limit := case v_plan
    when 'premium' then 35
    when 'business' then 60
    when 'basic' then 15
    else 3
  end;

  select count(*) into v_count
    from public.listings l
   where l.seller_id = new.seller_id
     and l.status = 'active'
     and l.id <> new.id;

  if v_count >= v_limit then
    raise exception 'ACTIVE_LISTING_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_paid_listing_limit() from public, anon;
grant execute on function public.enforce_paid_listing_limit() to authenticated;

comment on function public.enforce_paid_listing_limit() is
  'Enforces active listing limits for normal sellers; Bese26 owner admin is unlimited.';


-- ================================================================
-- SOURCE: supabase/migrations/20260915221000_admin_unlimited_listing_limit.sql
-- ================================================================

-- Admin listings must not fail when moderation changes a pending listing to active.
-- Owner and active admin profiles are unlimited; ordinary users keep their plan limits.

create or replace function private.is_bese26_unlimited_admin(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = p_user
      and coalesce(p.admin_suspended, false) = false
      and (
        lower(coalesce(u.email, '')) = 'smbabanbaba@gmail.com'
        or coalesce(p.app_role, '') = 'admin'
        or exists (
          select 1 from public.admin_team_members tm
          where tm.user_id = u.id
            and tm.active = true
            and 'listings' = any(tm.permissions)
        )
      )
  );
$$;
revoke all on function private.is_bese26_unlimited_admin(uuid) from public, anon;
grant execute on function private.is_bese26_unlimited_admin(uuid) to authenticated;

-- Approval and any direct listing activation now skip plan limits for admins based on seller_id.
create or replace function public.enforce_paid_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_plan text;
  v_limit integer;
  v_count integer;
begin
  if new.status <> 'active' or private.is_bese26_unlimited_admin(new.seller_id) then
    return new;
  end if;
  v_plan := public.current_active_plan(coalesce(new.seller_id, auth.uid()));
  v_limit := case v_plan when 'premium' then 35 when 'business' then 60 when 'basic' then 15 else 3 end;
  select count(*) into v_count
  from public.listings l
  where l.seller_id = new.seller_id and l.status = 'active' and l.id <> new.id;
  if v_count >= v_limit then raise exception 'ACTIVE_LISTING_LIMIT_REACHED'; end if;
  return new;
end;
$$;

drop trigger if exists listings_paid_limit_guard on public.listings;
create trigger listings_paid_limit_guard
before insert or update of status on public.listings
for each row execute function public.enforce_paid_listing_limit();

-- Keep the owner/admin status visible to the frontend entitlement panel.
create or replace function public.get_seller_entitlement()
returns table (
  plan_key text, subscription_status text, is_paid boolean, free_posts_limit integer,
  free_posts_used integer, free_posts_remaining integer, listing_limit integer,
  current_period_end timestamptz, boost_credits_limit integer, boost_credits_used integer,
  boost_credits_remaining integer, verification_eligible boolean
)
language plpgsql security definer set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_used integer := 0;
  v_boost record;
  v_unlimited boolean := false;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_unlimited := private.is_bese26_unlimited_admin(v_user);
  if v_unlimited then
    return query select 'admin', 'active', true, 2147483647, 0, 2147483647, 2147483647,
      null::timestamptz, 2147483647, 0, 2147483647, true;
    return;
  end if;
  select s.plan_key, s.status, s.current_period_end
  into v_plan, v_status, v_end
  from public.seller_subscriptions s where s.profile_id = v_user;
  select u.free_posts_used into v_used from public.seller_post_usage u where u.profile_id = v_user;
  select * into v_boost from public.ensure_monthly_boost_credits(v_user);
  return query select v_plan, v_status,
    v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free',
    3, coalesce(v_used, 0), greatest(3 - coalesce(v_used, 0), 0),
    case v_plan when 'basic' then 15 when 'premium' then 35 when 'business' then 60 else 3 end,
    v_end, coalesce(v_boost.credits_granted, 0), coalesce(v_boost.credits_used, 0),
    coalesce(v_boost.credits_remaining, 0), v_plan in ('premium', 'business') and v_status = 'active' and (v_end is null or v_end > now());
end;
$$;
revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260916143000_consistent_listing_limits.sql
-- ================================================================

-- Bese26 listing quota policy (single source of truth):
-- Free = 3 active listings; Basic = 15; Premium = 35; Business = 60.
-- The owner admin and admin approval actions are unlimited.

create or replace function public.listing_limit_for_plan(p_plan text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case lower(coalesce(p_plan, 'free'))
    when 'basic' then 15
    when 'premium' then 35
    when 'business' then 60
    else 3
  end;
$$;

revoke all on function public.listing_limit_for_plan(text) from public, anon;
grant execute on function public.listing_limit_for_plan(text) to authenticated;

create or replace function public.get_seller_entitlement()
returns table (
  plan_key text,
  subscription_status text,
  is_paid boolean,
  free_posts_limit integer,
  free_posts_used integer,
  free_posts_remaining integer,
  listing_limit integer,
  current_period_end timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_status text := 'inactive';
  v_end timestamptz;
  v_active_count integer := 0;
  v_paid boolean := false;
  v_limit integer := 3;
  v_owner_admin boolean := false;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  v_owner_admin := private.is_bese26_owner_admin();
  select s.plan_key, s.status, s.current_period_end
    into v_plan, v_status, v_end
    from public.seller_subscriptions s
   where s.profile_id = v_user;

  v_paid := v_owner_admin or (v_status = 'active' and (v_end is null or v_end > now()) and v_plan <> 'free');
  v_limit := case when v_owner_admin then 2147483647 else public.listing_limit_for_plan(v_plan) end;

  select count(*)::integer into v_active_count
    from public.listings l
   where l.seller_id = v_user
     and l.status = 'active';

  return query select
    case when v_owner_admin then 'admin' else coalesce(v_plan, 'free') end,
    coalesce(v_status, 'inactive'),
    v_paid,
    3,
    v_active_count,
    case when v_owner_admin then 2147483647 else greatest(v_limit - v_active_count, 0) end,
    v_limit,
    v_end;
end;
$$;

create or replace function public.enforce_paid_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_plan text;
  v_limit integer;
  v_count integer;
begin
  if new.status <> 'active' then return new; end if;

  -- Admin approval and owner-admin listings are never blocked by seller quotas.
  if private.is_bese26_owner_admin() then return new; end if;
  if exists (
    select 1 from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = new.seller_id
      and lower(coalesce(u.email, '')) = 'smbabanbaba@gmail.com'
      and p.app_role = 'admin'
      and coalesce(p.admin_suspended, false) = false
  ) then return new; end if;

  v_plan := public.current_active_plan(new.seller_id);
  v_limit := public.listing_limit_for_plan(v_plan);

  select count(*) into v_count
    from public.listings l
   where l.seller_id = new.seller_id
     and l.status = 'active'
     and l.id <> new.id;

  if v_count >= v_limit then
    raise exception 'ACTIVE_LISTING_LIMIT_REACHED';
  end if;
  return new;
end;
$$;

revoke all on function public.get_seller_entitlement() from public, anon;
grant execute on function public.get_seller_entitlement() to authenticated;
revoke all on function public.enforce_paid_listing_limit() from public, anon;
grant execute on function public.enforce_paid_listing_limit() to authenticated;

comment on function public.listing_limit_for_plan(text) is
  'Bese26 quota policy: free 3, basic 15, premium 35, business 60.';


-- ================================================================
-- SOURCE: supabase/migrations/20260917140000_admin_email_verification_grants.sql
-- ================================================================

create table if not exists public.admin_verification_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  grant_type text not null default 'manual_email',
  note text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_verification_grants_user_idx on public.admin_verification_grants(user_id, created_at desc);
alter table public.admin_verification_grants enable row level security;
drop policy if exists admin_verification_grants_moderator_read on public.admin_verification_grants;
create policy admin_verification_grants_moderator_read on public.admin_verification_grants
for select to authenticated using (public.current_user_can_moderate());

create or replace function public.admin_grant_verification_by_email(p_email text, p_note text)
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
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  if v_email is null or v_email = '' then raise exception 'EMAIL_REQUIRED'; end if;
  if v_note is null then raise exception 'REASON_REQUIRED'; end if;

  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  if v_user_id is null then raise exception 'USER_EMAIL_NOT_FOUND'; end if;

  update public.profiles
  set is_verified = true, updated_at = timezone('utc', now())
  where id = v_user_id
  returning * into v_profile;
  if v_profile.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  update public.business_profiles
  set is_verified = true, verification_status = 'verified', verified_at = timezone('utc', now()), updated_at = timezone('utc', now())
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

revoke all on function public.admin_grant_verification_by_email(text, text) from public, anon;
grant execute on function public.admin_grant_verification_by_email(text, text) to authenticated;


-- ================================================================
-- SOURCE: supabase/migrations/20260917150000_public_miniweb_follow_visibility.sql
-- ================================================================

-- Public Miniwebs show community counts and a small public list of followers/following.
-- Only relationship ids and joined public profile fields are selected by the frontend;
-- private account fields remain protected by the profiles table policies.
drop policy if exists profile_follows_public_read on public.profile_follows;
create policy profile_follows_public_read on public.profile_follows
for select to anon, authenticated using (true);

grant select on public.profile_follows to anon, authenticated;

