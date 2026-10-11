-- Profile-based Miniwebs are now the only automatic public identity.
-- Do not create a business_profiles row when a user registers.
-- Existing business records are preserved; this migration only disables future
-- automatic creation and does not delete user data.
drop function if exists private.ensure_account_miniweb(uuid, text, text);
