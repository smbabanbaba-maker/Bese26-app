-- Activate delegated admins with scoped permissions while keeping global owner controls owner-only.
create or replace function private.has_admin_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_bese26_owner_admin()
  or exists (select 1 from public.admin_team_members m where m.user_id = auth.uid() and m.active = true and p_permission = any(m.permissions));
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_bese26_owner_admin() or exists (select 1 from public.admin_team_members m where m.user_id = auth.uid() and m.active = true);
$$;

create or replace function private.is_moderator_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_bese26_owner_admin() or exists (select 1 from public.admin_team_members m where m.user_id = auth.uid() and m.active = true and (m.permissions && array['listings','verification','users','reports','support','businesses','advertising','payments']::text[]));
$$;

create or replace function public.current_user_can_moderate()
returns boolean language sql stable security invoker set search_path = public as $$
  select private.is_moderator_or_admin();
$$;
create or replace function public.current_user_is_admin()
returns boolean language sql stable security invoker set search_path = public as $$
  select private.is_admin();
$$;

-- Advertising is the first fully scoped write surface: only owner or advertising admins can write.
drop policy if exists ad_campaigns_admin_insert on public.ad_campaigns;
create policy ad_campaigns_admin_insert on public.ad_campaigns for insert to authenticated with check (private.has_admin_permission('advertising') and created_by = auth.uid());
drop policy if exists ad_campaigns_admin_update on public.ad_campaigns;
create policy ad_campaigns_admin_update on public.ad_campaigns for update to authenticated using (private.has_admin_permission('advertising')) with check (private.has_admin_permission('advertising'));
drop policy if exists ad_campaigns_admin_delete on public.ad_campaigns;
create policy ad_campaigns_admin_delete on public.ad_campaigns for delete to authenticated using (private.has_admin_permission('advertising'));

grant execute on function private.has_admin_permission(text) to authenticated;
