-- Final compatibility cleanup: launch_monetization_limits recreated the legacy
-- text[] overload after the earlier removal migration. Keep only the jsonb RPC,
-- which matches public.listings.delivery_options and the current frontend payload.
drop function if exists public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, text[], text, jsonb
);

revoke all on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
) from public, anon;

grant execute on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
) to authenticated;

comment on function public.create_listing_with_plan(
  uuid, uuid, text, text, numeric, text, text, text, integer, text,
  text, text, text, jsonb, text, jsonb
) is 'Creates a listing with JSON delivery options; authenticated sellers only.';

