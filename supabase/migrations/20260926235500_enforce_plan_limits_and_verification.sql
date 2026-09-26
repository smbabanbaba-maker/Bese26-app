-- Final Bese26 entitlement guard.
-- Free 3, Basic 15, Premium 35, Business 60 active listings.
-- Identity and business verification submissions require an active Premium or Business plan.

create or replace function public.listing_limit_for_plan(p_plan text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case lower(coalesce(p_plan, 'free'))
    when 'basic' then 15
    when 'premium' then 35
    when 'business' then 60
    else 3
  end;
$$;

revoke all on function public.listing_limit_for_plan(text) from public, anon;
grant execute on function public.listing_limit_for_plan(text) to authenticated;

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
  if new.status <> 'active' then return new; end if;
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
     and l.status = 'active'
     and l.id <> new.id;
  if v_count >= v_limit then
    raise exception 'ACTIVE_LISTING_LIMIT_REACHED';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_paid_listing_limit() from public, anon;
grant execute on function public.enforce_paid_listing_limit() to authenticated;
drop trigger if exists listings_paid_limit_guard on public.listings;
create trigger listings_paid_limit_guard
before insert or update of status on public.listings
for each row execute function public.enforce_paid_listing_limit();

create or replace function public.enforce_paid_verification_gate()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.user_id = auth.uid()
     and not public.current_user_can_moderate()
     and public.current_paid_plan(new.user_id) is null then
    raise exception 'PAID_PLAN_REQUIRED_FOR_VERIFICATION';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_paid_verification_gate() from public, anon;
grant execute on function public.enforce_paid_verification_gate() to authenticated;
drop trigger if exists verification_paid_plan_guard on public.verification_applications;
create trigger verification_paid_plan_guard
before insert or update on public.verification_applications
for each row execute function public.enforce_paid_verification_gate();

comment on function public.listing_limit_for_plan(text) is
  'Bese26 quota policy: free 3, basic 15, premium 35, business 60 active listings.';
comment on function public.enforce_paid_verification_gate() is
  'Only active Premium or Business subscribers may submit identity or business verification applications.';
