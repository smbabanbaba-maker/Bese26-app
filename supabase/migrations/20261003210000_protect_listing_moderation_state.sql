-- Prevent seller-owned PostgREST updates from changing moderation decisions.
-- Moderators/admins retain their existing review path. Sellers may still edit
-- content and manage approved listings, and rejected listings can be requeued
-- for review by the existing revise_rejected_listing RPC.

create or replace function private.guard_listing_moderation_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_is_owner boolean;
  v_can_moderate boolean;
  v_is_rejected_resubmission boolean;
begin
  v_is_owner := auth.uid() is not null and auth.uid() = old.seller_id;
  v_can_moderate := coalesce(private.is_moderator_or_admin(), false);
  v_is_rejected_resubmission :=
    old.status = 'rejected'
    and old.moderation_status = 'rejected'
    and new.status = 'pending'
    and new.moderation_status = 'pending'
    and new.rejection_reason is null
    and new.published_at is null;

  -- Service-role operations and non-owner edits continue through existing
  -- authorization; moderators/admins keep their established moderation flow.
  if not v_is_owner or v_can_moderate then
    return new;
  end if;

  if new.moderation_status is distinct from old.moderation_status
     and not v_is_rejected_resubmission then
    raise exception using
      errcode = '42501',
      message = 'Only Bese26 moderation can change listing approval status.';
  end if;

  if new.status = 'active'
     and old.moderation_status is distinct from 'approved' then
    raise exception using
      errcode = '42501',
      message = 'A listing must be approved before it can be activated.';
  end if;

  if new.rejection_reason is distinct from old.rejection_reason
     and not v_is_rejected_resubmission then
    raise exception using
      errcode = '42501',
      message = 'Only Bese26 moderation can change a listing rejection reason.';
  end if;

  if new.published_at is distinct from old.published_at
     and not v_is_rejected_resubmission then
    raise exception using
      errcode = '42501',
      message = 'Only Bese26 moderation can change a listing publication timestamp.';
  end if;

  return new;
end;
$function$;

drop trigger if exists listings_guard_moderation_state on public.listings;
create trigger listings_guard_moderation_state
before update of status, moderation_status, rejection_reason, published_at
on public.listings
for each row
execute function private.guard_listing_moderation_state();
