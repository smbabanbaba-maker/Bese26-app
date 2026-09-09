-- Harden Chat and Safe Deal workflows so participants cannot spoof parties or statuses.

create or replace function public.validate_chat_deal_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid;
  v_seller uuid;
  v_listing_seller uuid;
begin
  select c.buyer_id, c.seller_id into v_buyer, v_seller
  from public.conversations c where c.id = new.conversation_id;
  if v_buyer is null or v_seller is null then
    raise exception 'Conversation participants could not be verified';
  end if;

  if tg_table_name = 'chat_offers' then
    if new.buyer_id <> v_buyer or new.seller_id <> v_seller or new.buyer_id = new.seller_id then
      raise exception 'Offer parties must match the conversation';
    end if;
    if new.listing_id is null then
      raise exception 'Offer must reference a listing';
    end if;
    select l.seller_id into v_listing_seller from public.listings l where l.id = new.listing_id and l.status = 'active' and l.moderation_status = 'approved';
    if v_listing_seller is null or v_listing_seller <> v_seller then
      raise exception 'Offer listing is not active or does not belong to the seller';
    end if;
    if tg_op = 'INSERT' and new.status <> 'pending' then
      raise exception 'New offers must start as pending';
    end if;
    if tg_op = 'UPDATE' then
      if auth.uid() = v_seller and new.status not in ('accepted','rejected','countered') then
        raise exception 'Seller cannot use this offer status';
      end if;
      if auth.uid() = v_buyer and new.status <> 'cancelled' then
        raise exception 'Buyer can only cancel an offer';
      end if;
    end if;
  else
    if not (new.proposed_by = v_buyer or new.proposed_by = v_seller) then
      raise exception 'Meeting proposer must be a conversation participant';
    end if;
    if new.meeting_date < current_date then
      raise exception 'Meeting date cannot be in the past';
    end if;
    if tg_op = 'UPDATE' and new.status = 'cancelled' and auth.uid() <> old.proposed_by then
      raise exception 'Only the meeting proposer can cancel';
    end if;
    if tg_op = 'UPDATE' and new.status in ('accepted','declined') and auth.uid() = old.proposed_by then
      raise exception 'The other participant must respond to the meeting proposal';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists chat_offers_validate_permissions on public.chat_offers;
create trigger chat_offers_validate_permissions before insert or update on public.chat_offers for each row execute function public.validate_chat_deal_permissions();
drop trigger if exists chat_meetings_validate_permissions on public.chat_meetings;
create trigger chat_meetings_validate_permissions before insert or update on public.chat_meetings for each row execute function public.validate_chat_deal_permissions();

revoke update on public.chat_offers from authenticated;
revoke update on public.chat_meetings from authenticated;
grant update (status, updated_at) on public.chat_offers to authenticated;
grant update (status, updated_at) on public.chat_meetings to authenticated;
