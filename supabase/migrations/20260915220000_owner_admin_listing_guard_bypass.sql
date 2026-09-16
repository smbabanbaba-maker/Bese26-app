-- Owner admin listings must remain unlimited across every activation path,
-- including moderation approval (which updates status to active).
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
  v_owner_admin_seller boolean := false;
begin
  if new.status <> 'active' then
    return new;
  end if;

  -- The owner admin must be able to approve any pending listing, even when
  -- the seller has reached a normal plan cap.
  if private.is_bese26_owner_admin() then
    return new;
  end if;

  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = new.seller_id
      and lower(coalesce(u.email, '')) = 'smbabanbaba@gmail.com'
      and p.app_role = 'admin'
      and coalesce(p.admin_suspended, false) = false
  ) into v_owner_admin_seller;

  if v_owner_admin_seller then
    return new;
  end if;

  v_plan := public.current_active_plan(coalesce(new.seller_id, auth.uid()));
  v_limit := case v_plan
    when 'premium' then 35
    when 'business' then 60
    when 'basic' then 15
    else 3
  end;

  select count(*) into v_count
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

comment on function public.enforce_paid_listing_limit() is
  'Enforces active listing limits for normal sellers; Bese26 owner admin is unlimited.';
