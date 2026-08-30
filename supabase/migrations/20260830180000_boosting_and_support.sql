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
