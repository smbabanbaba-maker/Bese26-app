-- Bese26 production setup: remaining migrations
-- Run this after the base marketplace/auth migrations already applied.

-- ===== supabase/migrations/20260912171000_admin_ad_assets_storage.sql =====
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

-- ===== supabase/migrations/20260913001000_image_only_ad_campaigns.sql =====
-- Image-first campaign banners. When enabled, the uploaded artwork is rendered as the full campaign creative.
alter table public.ad_campaigns
  add column if not exists image_only boolean not null default false;

-- Existing advertiser artwork should use the image-first renderer too.
update public.ad_campaigns
set image_only = true
where image_url is not null;

comment on column public.ad_campaigns.image_only is 'Render the uploaded campaign artwork as the complete creative without generated text overlays.';

notify pgrst, 'reload schema';

-- ===== supabase/migrations/20260913003000_fix_ad_assets_permission.sql =====
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

-- ===== supabase/migrations/20260913004000_campaign_creative_dimensions.sql =====
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

-- ===== supabase/migrations/20260913005000_standardize_campaign_banner_size.sql =====
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

-- ===== supabase/migrations/20260913006000_admin_team_permissions.sql =====
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
