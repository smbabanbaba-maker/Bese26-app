# Bese26 Supabase Backend Report

## Scope and target

The backend changes in this report were applied only to Supabase project `slxsbvuskgkacmtkkrmj`, named **Bebe26** in the Supabase project metadata, hosted in `eu-west-2` and observed as `ACTIVE_HEALTHY`. The user-facing application brand remains **bese26**. No older Supabase project was modified. Subscription plans, payments, fees, checkout, and Shopify were not included.

## Completed Supabase layers

| Layer | Observed result |
| --- | --- |
| Database | The project began with no public tables or migrations. The marketplace foundation migration created 13 public tables for profiles, contacts, categories, category fields, listings, media, favorites, drafts, conversations, participants, messages, reviews, and notifications. Seed data created 22 categories and 16 category fields. |
| Auth | The frontend now uses passwordless Email OTP: `signInWithOtp` requests a code and `verifyOtp({ email, token, type: 'email' })` creates the session. Supabase's **Magic link or OTP** template was changed to a Bese26-branded code email using `{{ .Token }}`. A successful inbox delivery and code verification are not yet claimed because SMTP delivery still requires one controlled real-inbox test. |
| RLS | Every application table reports RLS enabled. Policies restrict public reads to active/approved marketplace content and restrict writes to the owning user, recipient, reviewer, or conversation participant as appropriate. Listing insertion is limited to pending moderation state, and clients cannot self-approve listings. |
| Storage | `listing-media` and `avatars` buckets exist. `listing-media` is private with a 10 MiB object limit and image/video MIME allow-list. `avatars` is public with a 5 MiB image-only limit. Listing media uses UUID-based owner/listing paths and signed URLs. |
| Realtime | `public.messages` and `public.notifications` are present in the `supabase_realtime` publication. Listings are intentionally not in Realtime. |
| Security advisors | The final Supabase security advisory check returned an empty lint list after moving privileged trigger and RLS helpers into the non-exposed `private` schema and fixing function search paths. |
| Public API | A bounded publishable-key REST check returned HTTP 200 for seeded active categories and active-approved listings. A public favorites request returned HTTP 200 with no rows, consistent with owner-only RLS rather than leaking private favorites. |

## Frontend changes

The Vite app now includes `@supabase/supabase-js`, `src/lib/supabase.js`, `src/lib/marketplace.js`, `.env.example`, and `src/components/AuthPanel.jsx`. The auth panel requests a six-digit Email OTP, validates the code input, supports resend/change-email actions, and listens to the existing Supabase session flow after verification. The app loads active approved listings and favorites when configured, while retaining the existing demo fallback when the live database is empty. Authenticated users can save listings, persist Sell drafts, submit pending listings, upload listing media, open a participant-scoped conversation, load persisted messages, send messages, and receive inserted messages through Realtime. The existing visual language and continuous vertical Sell form were preserved.

## Verification commands

The following checks passed locally with the Bese26 environment configured: `npm install`, `npm run build`, and `git diff --check`. The build passed after the Email OTP migration. The browser editor was used to configure the branded **Magic link or OTP** template with the `{{ .Token }}` placeholder. A real-inbox delivery and verification test remains outstanding because the previously configured SMTP path returned `Error sending confirmation email`; no SMTP credential was stored in the repository or repeated here.

## Remaining work

The production deployment already has the two Vercel environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` configured by the user and was previously verified as connected to Supabase. The next production verification is a single controlled OTP request followed by inbox delivery and code verification; this report does not claim that SMTP is currently working.

The demo Messages screen is now ready for a live conversation mode when a real approved listing and authenticated buyer/seller pair exist, but the full conversation-list query, chat attachment uploads, and two-account end-to-end Realtime test remain to be completed. Profile editing, notifications UI, reviews completion rules, moderation/admin screens, wallet persistence, AI integration, and push delivery are still staged follow-up work. Google OAuth and phone/SMS OTP were intentionally not configured because they are outside the requested Email OTP flow. Any Gmail App Password or backup codes exposed during earlier setup should be revoked/rotated by the account owner; no credential belongs in this repository.

## References

[1]: https://supabase.com/docs/guides/database/secure-data "Supabase: Securing your data"
[2]: https://supabase.com/docs/guides/storage/security/access-control "Supabase: Storage access control"
[3]: https://supabase.com/docs/guides/auth "Supabase: Auth documentation"
[4]: https://supabase.com/docs/guides/auth/auth-email-passwordless "Supabase: Passwordless email logins"
