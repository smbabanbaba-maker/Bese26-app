-- Bese26 admin status RPC: expose only the current user's boolean admin status.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.is_admin();
$$;

revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;
