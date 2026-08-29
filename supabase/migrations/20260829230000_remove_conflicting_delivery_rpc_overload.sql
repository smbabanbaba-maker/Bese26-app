-- Remove the legacy overload that accepted text[] delivery options.
-- The listings table stores delivery_options as jsonb, so only the jsonb RPC
-- should remain available to PostgREST/Supabase clients.
drop function if exists public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, text[], text, jsonb
);

-- Keep the intended jsonb signature explicit and restricted to signed-in sellers.
revoke all on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
) from public, anon;

grant execute on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
) to authenticated;
