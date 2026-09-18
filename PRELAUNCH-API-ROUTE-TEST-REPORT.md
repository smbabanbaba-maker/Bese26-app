# Bese26 Pre-Launch API and Routing Test Report

## Automated checks completed

The production build completed successfully with Vite after transforming 1,870 modules. Repository whitespace validation passed with `git diff --check`. The production preview served the SPA shell with HTTP 200 for `/`, `/business`, `/sell`, `/profile`, `/search`, `/saved`, `/messages`, `/notifications`, `/@demo-shop`, `/business/demo-shop`, `/store/demo-shop`, `/miniweb/demo-shop`, and `/listing/demo-listing`. The production JavaScript asset also returned HTTP 200. These route checks confirm that Vercel-style SPA fallback and static bundle delivery are working locally.

The final bundle contains the marketplace shell, bottom navigation, Admin Control Center, advertising controls, email-based verification grant UI, Miniweb follow/follower showcase, and public storefront styles. The bottom navigation still contains Home, Notifications, Saved, Sell, Messages, Business, and Profile.

## API surface audited

The frontend service layer was reviewed for Supabase Auth, database tables, RPC calls, storage buckets, Realtime subscriptions, Paystack checkout, listing moderation, messaging, chat media, offers, meetings, callbacks, reports, follows, saved listings, notifications, business profiles, public storefronts, KYC applications, Admin Team controls, advertising campaigns, verification review, and manual email verification grants.

## Live-only checks still required

The sandbox does not contain `.env`, `.env.local`, or production Supabase credentials; only `.env.example` is present. Therefore authenticated and database-backed requests were not executed against the live project. Before launch, run the following checks with a real admin account and a normal buyer/seller account: sign-up and sign-in; profile read/update; listing create, edit, publish, pause, delete, and media upload; business profile save and public Miniweb load; seller follow/unfollow and public follower/following counts; saved listing add/remove; chat send/read and Realtime updates; offer and meeting lifecycle; KYC submission and document upload; Admin listing approve/reject; Admin verification approve/reject/request-information; Admin email verification grant; advertising upload, create, activate, pause, and public placement; Paystack test checkout and callback; notification creation/read state; and storage access for avatars, listing media, verification documents, ad assets, and chat media.

## Deployment decision

The frontend is **build-ready and route-ready**. It is not possible to claim that every live API endpoint is production-ready until the current Supabase migrations are applied successfully and the above authenticated smoke tests are performed against the production project. Do not rerun the complete 83-file migration bundle on an already-initialized project. Use the latest safe patch for the missing moderator helper, manual email verification grant, and public Miniweb follow visibility, then verify the live RPCs and policies in Supabase.
