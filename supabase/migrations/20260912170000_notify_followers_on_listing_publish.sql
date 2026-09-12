-- Notify followers when a seller's listing becomes publicly available.
-- This keeps the following experience automatic: follow a seller once, then
-- receive a notification whenever that seller publishes a new approved item.
create or replace function public.notify_followers_on_listing_publish()
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
    select
      follows.follower_id,
      new.seller_id,
      'new_followed_listing',
      'A seller you follow posted a new item',
      new.title,
      jsonb_build_object('listing_id', new.id, 'seller_id', new.seller_id)
    from public.profile_follows as follows
    where follows.following_id = new.seller_id
      and follows.follower_id <> new.seller_id;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_notify_followers_after_publish on public.listings;
create trigger listings_notify_followers_after_publish
after insert or update of status, moderation_status on public.listings
for each row execute function public.notify_followers_on_listing_publish();
