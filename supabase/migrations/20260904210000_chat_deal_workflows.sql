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
