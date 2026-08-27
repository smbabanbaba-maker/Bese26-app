# bese26

**bese26** is a premium, mobile-first marketplace app for Nigeria. Its white-primary, red-accent interface lets people discover listings, search nearby goods and services, save items, post listings, message sellers, use the marketplace assistant, review wallet activity, and manage their account from one focused experience.

## Current product state

The repository now includes the first real Supabase backend foundation in project `slxsbvuskgkacmtkkrmj`: a flexible marketplace schema, Auth-ready profile trigger, Row Level Security (RLS), Storage buckets and policies, seeded categories, and Realtime publication entries for messages and notifications. The Vite frontend includes a publishable-key Supabase client, Email OTP Auth UI, active-listing and favorites query helpers, authenticated Sell draft persistence, listing creation, and browser media upload helpers.

The existing demo data remains as a deliberate fallback while each live flow is verified. Therefore, a missing live listing row does not make the Home screen blank, and demo-only Wallet, AI, profile, notification, and chat surfaces are not represented as fully production-backed features yet.

## Included experiences

| Experience | Current behavior |
| --- | --- |
| Home and Search | Existing simplified marketplace screens; live approved listings are loaded when configured and available, with demo fallback preserved. |
| Product detail | Gallery, key-detail chips, seller context, save, share, report, call, and chat actions. Chat opens a real conversation when both authenticated marketplace identities are available. |
| Saved | Favorites use Supabase for an authenticated user; unauthenticated browsing continues to use the existing local fallback state. |
| Sell | One continuous vertical form with category-aware fields, local validation, draft persistence, listing insertion with `pending` moderation status, and Storage upload helpers. |
| Auth | Email/password sign-up and sign-in panel. Confirmation email branding and SMTP delivery remain an external configuration to finish later; Google OAuth and phone/SMS OTP are not enabled. |
| Messages | Existing polished demo conversation UI remains in place while the database conversation and Realtime layer is wired and tested incrementally. |
| Wallet, AI, Profile, Notifications | Profile identity, seller statistics, and My Listings use authenticated Supabase reads; Wallet, some analytics/promotions, and notification persistence remain future integration slices. |

## Supabase architecture

The migration is stored at `supabase/migrations/20260827060000_marketplace_foundation.sql`. It creates `profiles`, `profile_contacts`, `categories`, `category_fields`, `listings`, `listing_media`, `listing_favorites`, `listing_drafts`, `conversations`, `conversation_participants`, `messages`, `reviews`, and `notifications`.

Listings use separate price, location, delivery, moderation, and status fields together with a JSONB `attributes` object. This keeps the model flexible for Nigerian categories such as Phones & Tablets, Electronics, Vehicles, Property, Fashion, Agriculture, and Jobs & Services without creating a separate table for every category. Binary images and videos stay in Supabase Storage; `listing_media` stores only object paths and metadata.

RLS is enabled on every application table. Public reads are limited to active approved listings, active categories, public profile rows, listing media attached to public listings, and published reviews. Authenticated users can manage only their own profile, contact data, drafts, listings, listing media, favorites, reviews, and notifications. Conversations and messages are participant-scoped. Storage uses `listing-media` and `avatars` buckets with MIME and size limits plus owner/path policies. Realtime is limited to `messages` and `notifications`.

## Local setup

Copy `.env.example` to `.env.local` and set the Bese26 project URL and publishable key. Do not add service-role keys, secret keys, database passwords, or `.env.local` to Git. The repository already ignores `.env` and `.env.*` while allowing the placeholder `.env.example`.

```bash
npm install
cp .env.example .env.local
npm run dev
npm run build
npm run preview
```

Required variables are:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

The browser client intentionally uses only `VITE_SUPABASE_PUBLISHABLE_KEY`. Supabase’s security model requires RLS for exposed tables and prohibits exposing service-role or secret keys in frontend code [1].

## Vercel deployment

Import `smbabanbaba-maker/Bese26-app` into the correct Vercel owner/team and connect the production branch `main`. The project remains a static Vite build; Supabase supplies the managed backend services.

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |
| Environment variable | `VITE_SUPABASE_URL` |
| Environment variable | `VITE_SUPABASE_PUBLISHABLE_KEY` |

Set both variables for the Vercel Production environment. Preview and Development environments may be configured separately when needed. Never put the publishable key in a server secret slot that is not exposed to the Vite build, and never add a service-role key to any `VITE_` variable.

## Rollout roadmap

1. **Completed foundation:** Supabase project verification, marketplace schema, seed categories, RLS policies, Storage buckets and policies, and Realtime publication entries.
2. **Completed initial client layer:** Supabase client module, environment template, email/password Auth panel, active listing query helper, favorites helper, draft persistence, listing insertion, and media upload helper.
3. **Completed marketplace account slice:** Authenticated Profile statistics and My Listings now read owner-scoped Supabase rows, with status tabs and a Create new listing action returning to the continuous Sell form.
4. **Next verification slice:** Use a dedicated test account to verify sign-up/sign-in, profile bootstrap, seller-only draft and listing mutations, public approved listing reads, Storage uploads, and favorite isolation.
5. **Next product slice:** Replace the remaining demo Wallet and seller analytics/promotions surfaces with persisted marketplace records and moderation-aware workflows.
6. **Later slices:** Complete Notifications, seller moderation/admin tools, review completion rules, AI integration, and production observability.
7. **Deferred by request:** Subscription plans, payments, fees, checkout, and wallet funding or withdrawal mechanics are intentionally not included in this phase.

## References

[1]: https://supabase.com/docs/guides/database/secure-data "Supabase: Securing your data"
[2]: https://supabase.com/docs/guides/storage/security/access-control "Supabase: Storage access control"
[3]: https://supabase.com/docs/guides/auth "Supabase: Auth documentation"
[4]: https://supabase.com/docs/guides/auth/auth-email-passwordless "Supabase: Passwordless email logins"
