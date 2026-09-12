-- Bese26: notify sellers about new followers and saved listings.
-- Both functions run as security definer so the event creator does not need
-- direct INSERT access to the recipient's notifications.

create or replace function public.notify_on_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
begin
  if new.follower_id = new.following_id then
    return new;
  end if;

  select coalesce(nullif(trim(display_name), ''), 'A Bese26 user')
    into v_actor_name
    from public.profiles
   where id = new.follower_id;

  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (
    new.following_id,
    new.follower_id,
    'new_follower',
    'You have a new follower',
    coalesce(v_actor_name, 'A Bese26 user') || ' started following you.',
    jsonb_build_object('follower_id', new.follower_id)
  );

  return new;
end;
$$;

drop trigger if exists profile_follows_notify_new_follower on public.profile_follows;
create trigger profile_follows_notify_new_follower
after insert on public.profile_follows
for each row execute function public.notify_on_new_follower();

create or replace function public.notify_on_listing_saved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_listing_title text;
  v_actor_name text;
begin
  select seller_id, title
    into v_seller_id, v_listing_title
    from public.listings
   where id = new.listing_id;

  if v_seller_id is null or v_seller_id = new.user_id then
    return new;
  end if;

  select coalesce(nullif(trim(display_name), ''), 'A buyer')
    into v_actor_name
    from public.profiles
   where id = new.user_id;

  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (
    v_seller_id,
    new.user_id,
    'listing_saved',
    'Someone saved your listing',
    coalesce(v_actor_name, 'Someone') || ' saved “' || coalesce(v_listing_title, 'your listing') || '”.',
    jsonb_build_object('listing_id', new.listing_id, 'seller_id', v_seller_id)
  );

  return new;
end;
$$;

drop trigger if exists listing_favorites_notify_listing_saved on public.listing_favorites;
create trigger listing_favorites_notify_listing_saved
after insert on public.listing_favorites
for each row execute function public.notify_on_listing_saved();

-- Keep notifications available to the existing Realtime frontend.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
         from pg_publication_rel pr
         join pg_class c on c.oid = pr.prrelid
         join pg_namespace n on n.oid = c.relnamespace
         join pg_publication p on p.oid = pr.pubpubid
        where p.pubname = 'supabase_realtime'
          and n.nspname = 'public'
          and c.relname = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

revoke all on function public.notify_on_new_follower() from public, anon;
revoke all on function public.notify_on_listing_saved() from public, anon;
grant execute on function public.notify_on_new_follower() to authenticated;
grant execute on function public.notify_on_listing_saved() to authenticated;
