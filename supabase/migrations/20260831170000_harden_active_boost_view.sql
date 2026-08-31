-- Ensure the public boost view respects the querying user's RLS policies.
alter view public.active_listing_boosts set (security_invoker = true);
