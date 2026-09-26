-- Security hardening: keep public view counting anonymous, but protect contact,
-- business-role, and chat-deal RPCs behind an authenticated session.
revoke all on function public.get_listing_contact(uuid) from public, anon;
grant execute on function public.get_listing_contact(uuid) to authenticated;

revoke all on function public.user_business_listing_role(uuid, uuid) from public, anon;
grant execute on function public.user_business_listing_role(uuid, uuid) to authenticated;

revoke all on function public.validate_chat_deal_permissions() from public, anon;
grant execute on function public.validate_chat_deal_permissions() to authenticated;

-- These indexes cover the foreign keys reported by Supabase advisors.
create index if not exists ad_campaigns_created_by_idx on public.ad_campaigns (created_by);
create index if not exists admin_audit_logs_actor_id_idx on public.admin_audit_logs (actor_id);
create index if not exists admin_team_members_created_by_idx on public.admin_team_members (created_by);
create index if not exists admin_verification_grants_actor_id_idx on public.admin_verification_grants (actor_id);
create index if not exists app_settings_updated_by_idx on public.app_settings (updated_by);
create index if not exists business_verification_events_actor_id_idx on public.business_verification_events (actor_id);
create index if not exists categories_parent_id_idx on public.categories (parent_id);
create index if not exists chat_meetings_proposed_by_idx on public.chat_meetings (proposed_by);
create index if not exists chat_offers_buyer_id_idx on public.chat_offers (buyer_id);
create index if not exists chat_offers_listing_id_idx on public.chat_offers (listing_id);
create index if not exists chat_offers_seller_id_idx on public.chat_offers (seller_id);
create index if not exists conversations_buyer_id_idx on public.conversations (buyer_id);
create index if not exists conversations_seller_id_idx on public.conversations (seller_id);
create index if not exists listing_boosts_package_id_idx on public.listing_boosts (package_id);
create index if not exists listing_comments_user_id_idx on public.listing_comments (user_id);
create index if not exists listing_favorites_listing_id_idx on public.listing_favorites (listing_id);
create index if not exists listing_media_owner_id_idx on public.listing_media (owner_id);
create index if not exists listing_moderation_events_admin_id_idx on public.listing_moderation_events (admin_id);
create index if not exists listing_moderation_events_listing_id_idx on public.listing_moderation_events (listing_id);
create index if not exists listing_reports_listing_id_idx on public.listing_reports (listing_id);
create index if not exists listing_reports_reporter_id_idx on public.listing_reports (reporter_id);
create index if not exists listing_views_viewer_id_idx on public.listing_views (viewer_id);
create index if not exists listings_subcategory_id_idx on public.listings (subcategory_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists notifications_actor_id_idx on public.notifications (actor_id);
create index if not exists profile_blocks_blocked_id_idx on public.profile_blocks (blocked_id);
create index if not exists profiles_admin_suspended_by_idx on public.profiles (admin_suspended_by);
create index if not exists recently_viewed_listing_id_idx on public.recently_viewed (listing_id);
create index if not exists reviews_reviewer_id_idx on public.reviews (reviewer_id);
create index if not exists support_replies_author_id_idx on public.support_replies (author_id);
create index if not exists support_tickets_assigned_to_idx on public.support_tickets (assigned_to);
create index if not exists verification_applications_reviewed_by_idx on public.verification_applications (reviewed_by);
