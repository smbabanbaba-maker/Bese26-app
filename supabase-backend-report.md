# Bese26 Supabase Backend Report

## Scope and target

The backend changes in this report were applied only to Supabase project `slxsbvuskgkacmtkkrmj`, named **Bebe26** in the Supabase project metadata, hosted in `eu-west-2` and observed as `ACTIVE_HEALTHY`. The user-facing application brand remains **bese26**. No older Supabase project was modified. Subscription plans, payments, fees, checkout, and Shopify were not included.

## Completed Supabase layers

| Layer | Observed result |
| --- | --- |
| Database | The project began with no public tables or migrations. The marketplace foundation migration created 13 public tables for profiles, contacts, categories, category fields, listings, media, favorites, drafts, conversations, participants, messages, reviews, and notifications. Seed data created 22 categories and 16 category fields. |
| Auth | The frontend uses the restored email/password flow. Custom SMTP was disabled after Gmail returned `535 BadCredentials`, returning the project to Supabase's default email service. The Site URL was corrected from localhost to `https://bese26-app.vercel.app`, and a confirmation email was observed; the old link had already been generated with the localhost destination. |
| RLS | Every application table reports RLS enabled. Policies restrict public reads to active/approved marketplace content and restrict writes to the owning user, recipient, reviewer, or conversation participant as appropriate. Listing insertion is limited to pending moderation state, and clients cannot self-approve listings. |
| Storage | `listing-media` and `avatars` buckets exist. `listing-media` is private with a 10 MiB object limit and image/video MIME allow-list. `avatars` is public with a 5 MiB image-only limit. Listing media uses UUID-based owner/listing paths and signed URLs. |
| Realtime | `public.messages` and `public.notifications` are present in the `supabase_realtime` publication. Listings are intentionally not in Realtime. |
| Admin moderation | The authorized `smbabanbaba@gmail.com` profile reports `app_role = 'admin'`. Pending listings and pending media have admin-only read policies, and `moderate_listing` accepts only admin approve/reject actions while writing `listing_moderation_events`. |
| Security advisors | After hardening the read-only admin-status helper to SECURITY INVOKER, the advisor reports one intentional WARN for the exposed SECURITY DEFINER moderation RPC (required so the RPC can enforce the admin check before changing listing state) and one separate Auth warning that leaked-password protection is disabled. |
| Public API | A bounded publishable-key REST check returned HTTP 200 for seeded active categories and active-approved listings. A public favorites request returned HTTP 200 with no rows, consistent with owner-only RLS rather than leaking private favorites. |

## Frontend changes

The Vite app now includes `@supabase/supabase-js`, `src/lib/supabase.js`, `src/lib/marketplace.js`, `.env.example`, `src/components/AuthPanel.jsx`, and `src/components/AdminView.jsx`. The current auth panel uses the restored email/password flow. Authenticated users can load owner-scoped My Listings by status, see real seller statistics derived from listings/favorites/profile rows, edit profile and contact records, save listings, persist Sell drafts, submit pending listings, upload listing media, open a participant-scoped conversation, load persisted messages, send messages, and receive inserted messages through Realtime. The authorized admin has a Profile → Admin Moderation entry that loads pending listings and calls the protected moderation RPC; the frontend removes a row from the queue after a successful response. Home, Search, Saved, Messages, Profile, and Sell no longer use fabricated listings, balances, identities, or success fallbacks. The existing visual language and continuous vertical Sell form were preserved.

## Verification commands

The following checks passed locally with the Bese26 environment configured: `npm install`, `npm run build`, and `git diff --check`. The build passed with the AdminView, admin data helpers, route gate, and responsive styles. A signed-out browser boundary check returned permission-denied for both `current_user_is_admin` and `moderate_listing`, so unauthenticated clients cannot invoke either RPC. A read-only database query confirmed the selected account’s profile has `app_role = 'admin'`; the migration, helper grants, and security advisor were checked only against project `slxsbvuskgkacmtkkrmj`. In the authenticated production session for that account, Profile displayed Admin Moderation, the queue loaded five pending rows with signed media where available, and an empty rejection reason was blocked without changing data. The Supabase dashboard still contains the earlier branded **Magic link or OTP** template work, but it is not used by the current password UI. Custom SMTP is currently disabled, so the project uses Supabase's default email sender and limits. The production Site URL now points to the Vercel app; no SMTP credential was stored in the repository or repeated here.

## Remaining work

The production deployment has the two Vercel environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` configured by the user and was previously verified as connected to Supabase. A controlled password sign-up should now be tested with a fresh email; the confirmation redirect must be generated after the Site URL change.

Messages now loads real participant-scoped conversations and persisted messages when a real approved listing and authenticated buyer/seller pair exist. Attachments, two-account end-to-end Realtime verification, notifications persistence, review completion rules, wallet persistence, and AI integration remain intentionally unbuilt rather than represented with fake UI. The admin dashboard frontend and backend boundary are implemented and an authenticated production admin session verified the Profile entry, five-row queue, signed media loading, and empty-reason guard. No real approve/reject state change was performed in this check; explicit owner authorization is still required before changing a seller listing’s public state. My Listings, Profile statistics, Personal Information, and Admin Moderation require signed-in accounts with real rows for full data-path verification. Google OAuth and phone/SMS OTP were not configured because the current requested flow is email/password. Any Gmail App Password or backup codes exposed during earlier setup should be revoked/rotated by the account owner; no credential belongs in this repository.

## References

[1]: https://supabase.com/docs/guides/database/secure-data "Supabase: Securing your data"
[2]: https://supabase.com/docs/guides/storage/security/access-control "Supabase: Storage access control"
[3]: https://supabase.com/docs/guides/auth "Supabase: Auth documentation"
[4]: https://supabase.com/docs/guides/auth/auth-email-passwordless "Supabase: Passwordless email logins"


## Jiji-style moderation follow-up

The moderation center now presents Pending, Approved, and Rejected tabs backed by `listing_moderation_events`. After the location-field query fix, the authenticated production admin session loaded Pending 0, Approved 5, and Rejected 0 without errors; the Approved tab displayed five reviewed listings, and Home displayed five approved live listings. This check did not perform a new state-changing action. The workflow mirrors the documented Jiji lifecycle—submission stays out of public search until review—while keeping Bese26’s admin authorization and audit trail under its own implementation.


## Review-loop, notifications, and policy expansion

The seller review loop now supports correction without duplicate listings. The secure `revise_rejected_listing` RPC accepts only the listing owner, only when the listing is `rejected/rejected`, updates the submitted fields, clears the rejection reason, and returns the same listing to `pending/pending`. It cannot approve or publish a listing. My Listings now exposes a clear **Rejected** tab with the stored review feedback and an **Edit & resubmit** action that opens the same listing in the continuous Sell form.

The protected `moderate_listing` RPC now creates a recipient-scoped notification for the seller after an approve or reject decision. The frontend notification bell reads only the signed-in user’s notifications, marks only that user’s rows as read, and subscribes to inserts through Supabase Realtime. The database supports a controlled `moderator` role alongside `admin`; no additional moderator has been assigned. Profile role columns are excluded from ordinary self-service update grants.

Profile now includes explicit Terms & Conditions, Privacy Policy, Safety Center, and Prohibited Items guidance. Wallet, payments, subscriptions, delivery checkout, AI, and promotion mechanics remain deferred and are not represented as live functionality.

The expanded implementation passes the local Vite build and `git diff --check`. A new live state-changing approve/reject/resubmit sequence still requires explicit owner-authorized testing; this report does not claim that sequence has been performed.
