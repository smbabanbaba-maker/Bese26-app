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
