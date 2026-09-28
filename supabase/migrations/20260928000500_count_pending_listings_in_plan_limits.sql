-- Count submitted listings as quota usage immediately.
-- A seller must not bypass a plan limit by creating many pending listings
-- before moderation changes them to active.

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
  if new.status not in ('pending', 'active') then return new; end if;
  if private.is_bese26_owner_admin() then return new; end if;
  if exists (
    select 1 from public.profiles p
    where p.id = new.seller_id
      and p.app_role = 'admin'
      and coalesce(p.admin_suspended, false) = false
  ) and public.current_user_can_moderate() then
    return new;
  end if;

  v_plan := public.current_active_plan(new.seller_id);
  v_limit := public.listing_limit_for_plan(v_plan);
  select count(*)::integer into v_count
    from public.listings l
   where l.seller_id = new.seller_id
     and l.status in ('pending', 'active')
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
  'Bese26 quota guard: pending and active listings both consume plan slots.';
