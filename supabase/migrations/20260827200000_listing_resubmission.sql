-- Bese26: allow a seller to send a rejected listing back for review.
-- The RPC is deliberately narrow: it cannot edit listing content or approve a listing.

create or replace function public.resubmit_rejected_listing(p_listing_id uuid)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_listing public.listings;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  update public.listings
  set status = 'pending',
      moderation_status = 'pending',
      rejection_reason = null,
      published_at = null,
      updated_at = timezone('utc', now())
  where id = p_listing_id
    and seller_id = auth.uid()
    and status = 'rejected'
    and moderation_status = 'rejected'
  returning * into updated_listing;

  if updated_listing.id is null then
    raise exception using errcode = '42501', message = 'Only your rejected listings can be resubmitted';
  end if;

  return updated_listing;
end;
$$;

revoke all on function public.resubmit_rejected_listing(uuid) from public, anon;
grant execute on function public.resubmit_rejected_listing(uuid) to authenticated;
