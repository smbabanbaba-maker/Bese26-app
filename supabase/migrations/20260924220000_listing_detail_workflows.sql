-- Listing Details production workflows: callback and offer notifications.
-- Non-destructive: adds indexes/triggers only to existing entities.

create unique index if not exists listing_callback_active_unique
  on public.listing_callback_requests (listing_id, requester_id)
  where status in ('pending', 'contacted');

create or replace function public.notify_listing_callback_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
  values (
    new.seller_id,
    new.requester_id,
    'callback_request',
    'Callback request',
    'A buyer is interested in your listing and would like you to call them.',
    jsonb_build_object('callback_request_id', new.id, 'listing_id', new.listing_id, 'status', new.status)
  );
  return new;
end;
$$;

drop trigger if exists listing_callback_request_notify on public.listing_callback_requests;
create trigger listing_callback_request_notify
after insert on public.listing_callback_requests
for each row execute function public.notify_listing_callback_request();

create or replace function public.notify_listing_offer_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  recipient uuid;
  actor uuid;
  title text;
  body text;
begin
  if tg_op = 'INSERT' then
    recipient := new.seller_id;
    actor := new.buyer_id;
    title := 'New offer received';
    body := 'A buyer sent an offer on one of your listings.';
  else
    recipient := case when auth.uid() = new.seller_id then new.buyer_id else new.seller_id end;
    actor := auth.uid();
    title := 'Offer updated';
    body := 'The offer status is now ' || replace(new.status, '_', ' ') || '.';
  end if;

  if recipient is not null and actor is distinct from recipient then
    insert into public.notifications (recipient_id, actor_id, notification_type, title, body, data)
    values (
      recipient,
      actor,
      case when tg_op = 'INSERT' then 'offer_received' else 'offer_updated' end,
      title,
      body,
      jsonb_build_object('offer_id', new.id, 'listing_id', new.listing_id, 'conversation_id', new.conversation_id, 'status', new.status, 'amount', new.amount)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists chat_offer_notify_insert on public.chat_offers;
create trigger chat_offer_notify_insert
after insert on public.chat_offers
for each row execute function public.notify_listing_offer_event();

drop trigger if exists chat_offer_notify_update on public.chat_offers;
create trigger chat_offer_notify_update
after update of status on public.chat_offers
for each row when (old.status is distinct from new.status)
execute function public.notify_listing_offer_event();

revoke all on function public.notify_listing_callback_request() from public, anon;
revoke all on function public.notify_listing_offer_event() from public, anon;
