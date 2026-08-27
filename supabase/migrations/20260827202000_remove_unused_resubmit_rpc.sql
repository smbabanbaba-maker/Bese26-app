-- Bese26: remove the earlier narrow helper superseded by revise_rejected_listing.
drop function if exists public.resubmit_rejected_listing(uuid);
