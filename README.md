# bese26

**bese26** is a premium, mobile-first marketplace app for Nigeria. Its white-primary, red-accent interface lets people discover approved listings, search nearby goods and services, save items, post listings, message sellers, and manage their account from one focused experience.

## Current product state

The repository now includes the first real Supabase backend foundation in project `slxsbvuskgkacmtkkrmj`: a flexible marketplace schema, Auth-ready profile trigger, Row Level Security (RLS), Storage buckets and policies, seeded categories, and Realtime publication entries for messages and notifications. The Vite frontend includes a publishable-key Supabase client, email/password Auth UI, active-listing and favorites query helpers, authenticated Sell draft persistence, listing creation, and browser media upload helpers.

The app has been converted to a real marketplace experience: all demo fallbacks, hardcoded listings, fake balances, and no-op placeholders have been removed. Every visible surface now uses real Supabase state or displays a truthful empty/loading state. Non-functional demo screens like Wallet and AI have been removed from primary navigation until their corresponding backend services are connected.

## Included experiences

| Experience | Current behavior |
| --- | --- |
| Home and Search | Displays only approved Supabase listings with real counts and categories. No demo fallback. |
| Product detail | Shows real attributes, seller rating, and verified status from Supabase. Chat opens a real buyer-seller conversation. |
| Saved | Displays only real authenticated favorite listings from Supabase. |
| Sell | Continuous vertical form requiring authentication and Supabase for publishing. Real draft and media upload persistence; rejected listings can be edited and resubmitted for review. |
| Auth | Email/password authentication. Redirects to live Vercel URL after confirmation. |
| Messages | Real conversation list and message history for authenticated users. New-message notifications are stored in the recipient-scoped notifications table. |
| Profile | Real identity, location, and statistics from Supabase. Personal Information form updates real profile and contact records. |
| Admin moderation | Controlled admin/moderator access shows Pending, Approved, and Rejected queues. Review actions use a protected Supabase RPC; sellers receive a real notification and can edit/resubmit rejected listings. |
| Wallet and AI | Removed from primary navigation until real backend services are implemented. |

## Supabase architecture

The foundation migration is stored at `supabase/migrations/20260827060000_marketplace_foundation.sql`. The moderation migrations `20260827190000_admin_moderation.sql`, `20260827191000_admin_status_rpc.sql`, `20260827192000_admin_status_invoker.sql`, `20260827193000_admin_policy_grants.sql`, `20260827200000_listing_resubmission.sql`, `20260827200500_revise_rejected_listing.sql`, and `20260827201500_moderation_roles_notifications.sql` add the controlled admin/moderator roles, moderation audit events, protected queue reads, seller revision boundary, notification side effects, and approve/reject RPC boundary. Together they create `profiles`, `profile_contacts`, `categories`, `category_fields`, `listings`, `listing_media`, `listing_favorites`, `listing_drafts`, `conversations`, `conversation_participants`, `messages`, `reviews`, `notifications`, and `listing_moderation_events`.

Listings use separate price, location, delivery, moderation, and status fields together with a JSONB `attributes` object. This keeps the model flexible for Nigerian categories such as Phones & Tablets, Electronics, Vehicles, Property, Fashion, Agriculture, and Jobs & Services without creating a separate table for every category. Binary images and videos stay in Supabase Storage; `listing_media` stores only object paths and metadata.

RLS is enabled on every application table. Public reads are limited to active approved listings, active categories, public profile rows, listing media attached to public listings, and published reviews. Authenticated users can manage only their own profile, contact data, drafts, listings, listing media, favorites, reviews, and notifications. Conversations and messages are participant-scoped. Only the user-selected admin account `smbabanbaba@gmail.com` is initially assigned `app_role = 'admin'`; the `moderator` role exists for future controlled assignments, while ordinary users cannot grant themselves a role or approve listings. Profile role columns are excluded from ordinary self-service grants. Storage uses `listing-media` and `avatars` buckets with MIME and size limits plus owner/path policies; moderator pending-media reads are restricted to the moderation queue. Realtime is limited to `messages` and `notifications`.

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
3. **Completed real-app cleanup:** Removed all demo fallbacks, hardcoded data, and non-functional placeholders. Home, Search, Saved, Messages, and Profile now use real Supabase state exclusively.
4. **Completed profile management:** Personal Information form now updates real Supabase profile and contact tables.
5. **Completed moderation foundation:** Sellers publish into Pending; controlled admin/moderator access can review pending listings, approve or reject with a reason, and record an audit event.
6. **Completed seller review loop:** Sellers can see rejection feedback, edit the same listing, and resubmit it to Pending without creating a duplicate or self-approving.
7. **Completed real notifications and policy layer:** Moderation decisions create recipient-scoped notifications; the notification bell uses Supabase data and Realtime; Terms, Privacy, Safety, and Prohibited Items pages are available in Profile.
8. **Next product slice:** Complete real chat end-to-end QA, moderation notifications QA, and controlled moderator assignment tooling.
9. **Later slices:** Implement real Wallet ledger, payment integration, and AI marketplace assistant.
10. **Deferred by request:** Subscription plans, payments, fees, checkout, and wallet funding or withdrawal mechanics are intentionally not included in this phase.

## References

[1]: https://supabase.com/docs/guides/database/secure-data "Supabase: Securing your data"
[2]: https://supabase.com/docs/guides/storage/security/access-control "Supabase: Storage access control"
[3]: https://supabase.com/docs/guides/auth "Supabase: Auth documentation"
[4]: https://supabase.com/docs/guides/auth/auth-email-passwordless "Supabase: Passwordless email logins"
