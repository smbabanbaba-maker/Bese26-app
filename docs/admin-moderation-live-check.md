# Bese26 admin moderation live check

Date: 2026-08-27

The production app at `https://bese26-app.vercel.app/?v=099a3da&reload=2` was opened with the authenticated session for `smbabanbaba@gmail.com`. The profile loaded as an admin and displayed **Admin Moderation** under **Profile → My Marketplace**. The moderation page loaded five pending listing rows from Supabase, including real seller/category/price/location values and signed media URLs for rows that have media.

No listing was approved or rejected during this check. The first row’s rejection form opened successfully, and pressing **Confirm reject** with an empty reason showed `Add a short reason before rejecting this listing.` while the queue remained unchanged. This verified the client-side rejection guard without changing production data.

A prior signed-out check returned permission-denied for both the admin-status and moderation RPC calls. The Supabase database role check returned `app_role = admin` for the authorized account. The separate migration `20260827193000_admin_policy_grants.sql` was applied after the first live session exposed a missing execute grant for RLS helper functions; the authenticated admin page then loaded successfully.

The first production approval/rejection remains pending explicit owner authorization because it changes a seller’s listing state and public visibility.
