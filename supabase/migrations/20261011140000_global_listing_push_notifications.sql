-- Send one in-app notification to every opted-in device when a listing becomes public.
-- Followers keep their more specific notification from the existing trigger; this
-- global trigger excludes them so they do not receive duplicate alerts.
create or replace function public.notify_all_users_on_listing_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active'
     and new.moderation_status = 'approved'
     and (
       tg_op = 'INSERT'
       or old.status is distinct from 'active'
       or old.moderation_status is distinct from 'approved'
     ) then
    insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
    select distinct
      subscriptions.user_id,
      new.seller_id,
      'new_marketplace_listing',
      'New items on Bese26',
      new.title,
      jsonb_build_object('listing_id', new.id, 'seller_id', new.seller_id, 'url', '/listing/' || new.id)
    from public.push_subscriptions as subscriptions
    where subscriptions.user_id <> new.seller_id
      and not exists (
        select 1 from public.profile_follows as follows
        where follows.follower_id = subscriptions.user_id
          and follows.following_id = new.seller_id
      );
  end if;
  return new;
end;
$$;

drop trigger if exists listings_notify_all_users_after_publish on public.listings;
create trigger listings_notify_all_users_after_publish
after insert or update of status, moderation_status on public.listings
for each row execute function public.notify_all_users_on_listing_publish();

create or replace function public.dispatch_web_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text := 'https://slxsbvuskgkacmtkkrmj.supabase.co/functions/v1/send-web-push';
begin
  if new.notification_type in ('new_message', 'new_marketplace_listing', 'new_followed_listing', 'listing_moderated', 'identity_verification_reviewed', 'business_verification_reviewed') then
    begin
      perform net.http_post(
        url := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('notification_id', new.id)
      );
    exception when others then
      raise warning 'Bese26 web push dispatch skipped: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;
