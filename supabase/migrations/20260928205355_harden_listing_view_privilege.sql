-- Listing view counters must not be writable by anonymous callers.
-- Public visitors can still browse listings; only authenticated sessions record a view.
revoke execute on function public.record_listing_view(uuid) from anon;
grant execute on function public.record_listing_view(uuid) to authenticated;
