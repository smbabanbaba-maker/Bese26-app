-- Notify a comment owner when another user replies to their public listing comment.
-- Self-replies are intentionally ignored to avoid noisy notifications.
create or replace function public.notify_listing_comment_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_owner_id uuid;
  listing_title text;
begin
  if new.status <> 'published' or new.parent_comment_id is null then
    return new;
  end if;

  select user_id
    into parent_owner_id
    from public.listing_comments
   where id = new.parent_comment_id
     and listing_id = new.listing_id;

  if parent_owner_id is null or parent_owner_id = new.user_id then
    return new;
  end if;

  select title
    into listing_title
    from public.listings
   where id = new.listing_id;

  insert into public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    title,
    body,
    data
  )
  values (
    parent_owner_id,
    new.user_id,
    'listing_comment_reply',
    'Someone replied to your comment',
    case
      when listing_title is null or trim(listing_title) = '' then 'A new reply was added to your public comment.'
      else 'A new reply was added to your comment on “' || left(listing_title, 120) || '”.'
    end,
    jsonb_build_object(
      'listing_id', new.listing_id,
      'comment_id', new.id,
      'parent_comment_id', new.parent_comment_id
    )
  );

  return new;
end;
$$;

revoke all on function public.notify_listing_comment_reply() from public, anon;
grant execute on function public.notify_listing_comment_reply() to authenticated;

drop trigger if exists listing_comments_notify_reply on public.listing_comments;
create trigger listing_comments_notify_reply
after insert on public.listing_comments
for each row execute function public.notify_listing_comment_reply();
