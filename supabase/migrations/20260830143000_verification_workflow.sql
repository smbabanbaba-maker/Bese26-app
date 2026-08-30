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
