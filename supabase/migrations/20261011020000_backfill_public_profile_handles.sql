-- Ensure older accounts and their existing listings also resolve to a public Miniweb.
do $$
declare
  r record;
  v_base text;
  v_suffix text;
  v_username text;
  v_attempt integer;
begin
  for r in
    select id, display_name
    from public.profiles
    where nullif(trim(username), '') is null
  loop
    v_base := trim(both '-' from left(regexp_replace(lower(coalesce(nullif(trim(r.display_name), ''), 'bese26 user')), '[^a-z0-9]+', '-', 'g'), 30));
    v_suffix := substr(replace(r.id::text, '-', ''), 1, 6);
    if length(v_base) < 3 then v_base := 'member'; end if;
    v_username := v_base;
    v_attempt := 0;

    while exists (select 1 from public.profiles p where lower(p.username) = lower(v_username) and p.id <> r.id) loop
      v_attempt := v_attempt + 1;
      v_username := trim(both '-' from left(v_base, 22)) || '-' || v_suffix || case when v_attempt > 1 then '-' || v_attempt::text else '' end;
      v_username := left(v_username, 30);
    end loop;

    update public.profiles
    set username = v_username, updated_at = timezone('utc', now())
    where id = r.id and nullif(trim(username), '') is null;
  end loop;
end;
$$;
