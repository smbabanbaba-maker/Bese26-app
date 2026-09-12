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
