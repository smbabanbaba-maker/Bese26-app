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
