-- Keep the remaining conversation UPDATE policy aligned with the block checks
-- used for conversation SELECT/INSERT and message SELECT/INSERT.
drop policy if exists conversations_participant_update on public.conversations;

create policy conversations_participant_update
on public.conversations
for update
to authenticated
using (
  (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()))
  and not public.users_are_blocked(buyer_id, seller_id)
)
with check (
  (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()))
  and not public.users_are_blocked(buyer_id, seller_id)
);
