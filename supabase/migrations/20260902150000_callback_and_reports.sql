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
