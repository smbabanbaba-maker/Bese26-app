-- Bese26 RLS helper grants: allow policy evaluation to invoke private helpers.
-- The helpers remain outside exposed API schemas and keep SECURITY DEFINER search paths.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

grant execute on function private.is_admin() to authenticated;
grant execute on function private.admin_can_read_listing_storage_path(text) to authenticated;
