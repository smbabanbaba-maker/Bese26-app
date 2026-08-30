-- Harden privileges discovered during the Bese26 production security review.
-- Account deletion is an authenticated self-service action only.
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Keep the legacy trigger function safe for the profile-preferences triggers
-- that still reference it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;
