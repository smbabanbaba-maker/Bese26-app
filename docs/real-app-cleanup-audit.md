# Bese26 real-app cleanup audit

## Scope

The audit covers the current React/Vite app, Supabase data layer, live Vercel URL, and the primary marketplace surfaces. The requested rule is: a feature must use real Supabase state or be removed/hidden until it does.

## Initial findings

| Surface | Current state | Action needed |
|---|---|---|
| Home/Search | The app queries active approved Supabase listings, but falls back to the hardcoded `src/data.js` listing array when the database has no rows. | Remove the demo listing fallback in production and provide a truthful empty state; keep local fixture data only behind an explicit development mode if needed. |
| Listing detail | Detail/gallery/seller values are real when opened from live rows, but demo fallback rows still populate the UI. Call/share/report remain toast-only. | Keep real listing detail; remove demo fallback and make call/share/report honest or remove them. |
| Auth | Email/password is implemented; confirmation delivery depends on Supabase configuration. | Keep auth, but do not claim account creation until a real confirmation test succeeds. |
| Sell | Connected draft/listing/media helpers exist, but disconnected mode still presents a publish-success path and local draft fallback. | Require authentication and Supabase for publish; show a clear unavailable state instead of fake success. |
| My Listings/Profile | Owner-scoped listing queries and statistics are implemented. | Keep, add loading/empty/error states, and verify with a real signed-in account. |
| Saved | Supabase favorites are used for an authenticated user, but anonymous mode uses local demo IDs and Saved includes hardcoded saved sellers/search. | Remove hardcoded saved items/sellers/search from production; show real empty state until backend records exist. |
| Messages | Listing-to-chat and message persistence are partially real for authenticated users, but the default screen shows hardcoded conversations/messages and attachments are toast-only. | Remove demo thread fallback in production; show an empty state until real conversations exist and keep attachment action honest. |
| Notifications | The panel renders hardcoded notifications and a no-op `Mark all as read` button. | Replace with `notifications` table query/update or remove panel content/action until implemented. |
| Wallet | Balance, transactions, Add money, and Withdraw are demo-only. | Remove Wallet from primary navigation until a real ledger/payment boundary exists, or replace with a clear unavailable screen. |
| AI | Replies are hardcoded from `demoAiReplies` and a timeout, not an AI/backend service. | Remove AI from primary navigation until connected to an approved backend, or show a truthful coming-later page without fake answers. |
| Seller Analytics/Promotions | Hardcoded charts, counts, and promotion actions remain in Profile. | Remove these screens/cards until backed by real event/payment data. |
| Profile menus/legal/help | Several rows open generic demo/info surfaces; logout and auth-aware profile are real. | Keep real account actions; remove or label nonfunctional items rather than implying completed features. |

## Key implementation rule

The cleanup should prefer empty, truthful states over invented listings, balances, messages, notifications, seller counts, or AI answers. The only allowed fallback is an explicit development fixture mode that cannot be mistaken for production data.

## Scope decisions

The first production cleanup slice will keep Home, Search, listing details, Auth, Sell, Profile, My Listings, Saved listings, and real buyer-seller chat. These surfaces already have Supabase tables or client helpers and can be made truthful with empty/loading/error states.

Wallet, AI, notification feed, seller analytics, promotion packages, saved sellers, and saved searches will not display fabricated balances, counts, replies, or activity. They will be removed from primary navigation or replaced with a clear unavailable state until their corresponding backend records and workflows exist. Payments and subscription mechanics remain deferred by request.


## Live verification after real-only cleanup

The public build at `https://bese26-app.vercel.app/?v=f6f145a` served the latest bundle fingerprint. Home showed `0 live listings` and a truthful approved-listings empty state, with no demo cards. Profile showed zero Listings/Sold/Saved counters, no hardcoded seller identity, and only real account, marketplace, preferences, help, safety, and legal actions; Wallet, AI, analytics, promotions, fake notifications, and demo seller tools were absent from the visible screen.

The live Sell screen now starts with `0/12` media and no starter demo photos or hardcoded seller name; it shows the real listing form and publish boundary. The live Saved screen showed `0` and `Your shortlist is empty`, with no fake saved items.

The live Messages screen showed `No conversations yet` and `Select a listing to start a real conversation`, with no fabricated thread or message. Returning to Home remained stable and showed `0 live listings` with the same approved-listings empty state.


## Listing publish verification

A read-only Supabase query confirmed that recent Sell submissions are present in `public.listings` with `status = pending` and `moderation_status = pending`. A second query confirmed real `public.listing_media` rows with image MIME types and non-zero file sizes for recent submissions. The upload path is therefore working; public Home intentionally excludes these rows until moderation changes them to active/approved. The Sell success copy and My Listings Pending tab now explain this boundary.


## Admin moderation implementation and security checks

The first admin account is the user-authorized `smbabanbaba@gmail.com`; a read-only query confirmed its profile has `app_role = 'admin'`. The moderation migration adds `listing_moderation_events`, admin-only pending listing/media reads, and the protected `moderate_listing` RPC. The RPC accepts only `approve` or `reject`, requires an admin check, changes only a currently pending/pending listing, and records the acting admin and action. Admin role assignment is not exposed as a self-service profile update.

The frontend adds a profile-only entry at **Profile → Admin Moderation**. It loads pending rows from Supabase, displays seller/category/price/location/media details, requires a rejection reason, and removes a successfully reviewed item from the queue. Home continues to query only `active` plus `approved` listings, so an approval is the deliberate boundary that makes a listing public.

Local verification passed with `npm run build` and `git diff --check`. In a signed-out browser session, both the admin-status RPC and moderation RPC returned permission-denied, confirming unauthenticated clients cannot invoke them. The Supabase security advisor no longer reports the unnecessary SECURITY DEFINER admin-status helper; it retains one intentional warning for the exposed moderation RPC because that privileged RPC is required to enforce the admin-only state transition, plus the separate Auth warning that leaked-password protection is disabled.

An authenticated admin has not yet completed a live browser session in this audit, so no approve/reject state change or production queue result is claimed until the owner signs in through the normal Bese26 email/password flow and explicitly authorizes one real test action.
