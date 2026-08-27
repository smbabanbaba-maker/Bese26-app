-- Bese26 admin status hardening: this read-only boolean helper needs no SECURITY DEFINER.
-- Target: Supabase project slxsbvuskgkacmtkkrmj only.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role = 'admin'
  );
$$;

revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;
