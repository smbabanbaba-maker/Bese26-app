# Bese26 Supabase Architecture Plan

## Scope

This document defines the first production-minded backend foundation for **bese26**, using only Supabase project `slxsbvuskgkacmtkkrmj` in West Europe. Subscription plans, payments, checkout, fees, and Shopify are intentionally outside this phase.

The existing repository is a mobile-first Vite React application, so the integration will be incremental rather than a re-scaffold. The publishable key will be used only in the browser; service-role or secret keys will not be committed or exposed. Supabase recommends pairing a browser publishable key with Row Level Security (RLS), and never exposing service-role or secret keys in frontend code [1].

## Data model

| Area | Tables | Purpose |
|---|---|---|
| Identity | `profiles`, `profile_contacts` | Public seller identity/location plus private contact data. A trigger creates a profile row whenever Supabase Auth creates a user. |
| Taxonomy | `categories`, `category_fields` | Hierarchical categories and flexible per-category field definitions without creating one table per category. |
| Marketplace | `listings`, `listing_media`, `listing_favorites`, `listing_drafts` | Listings use separate title, price, condition, location, delivery, moderation, and JSONB `attributes` fields. Media stores object metadata only; binary files stay in Storage [2]. |
| Messaging | `conversations`, `conversation_participants`, `messages` | Participant-scoped conversations and messages. A trigger adds both participants and creates notifications for new messages. |
| Trust and alerts | `reviews`, `notifications` | Future-ready review records and recipient-only notifications. Reviews begin in `pending` status and cannot be self-approved by clients. |

All primary keys are UUIDs. Business timestamps are UTC `timestamptz` values. Mutable records use an `updated_at` trigger. Foreign keys cascade only where deleting the parent should remove dependent private data; listing and review history remain intentionally conservative.

## Security model

The public application can read active listings, active categories, category fields, public profile fields, and approved reviews. A signed-in user can manage only their own profile, private contact row, drafts, listings, media, favorites, and notifications. A listing seller can manage media only for listings they own. A conversation or message is readable only by a participant, and messages can be inserted only by the authenticated sender who is already a participant.

RLS is enabled on every application table. Storage uses a private `listing-media` bucket with UUID-based user/listing paths and policies for authenticated owners plus active-listing reads. A public `avatars` bucket is used only for profile images with owner-restricted writes. The Storage policy design follows Supabase’s documented `storage.foldername()`, `owner_id`, and operation-specific policy helpers [3].

Realtime is enabled only for `messages` and `notifications`, after RLS is applied. Listings remain ordinary query data and are not placed in the realtime publication at this stage.

## Auth baseline

The first frontend auth slice will use Supabase email/password Auth with email confirmation if the project’s Auth settings permit it. Google OAuth is not enabled because it requires provider credentials and redirect configuration; phone OTP is not enabled because it requires an approved SMS provider. Supabase Auth issues JWTs that can be used with RLS for row-by-row authorization [4].

## Rollout order

1. Apply the database, policies, seed taxonomy, Storage buckets, and Realtime publication migration.
2. Add `@supabase/supabase-js`, a publishable-key client, `.env.example`, and documentation without secrets.
3. Add email/password session handling and profile bootstrap.
4. Replace local listing drafts and publish with database rows, Storage uploads, and `listing_media` metadata.
5. Persist favorites and replace demo chat with participant-scoped messages and Realtime.
6. Replace Home/Search/Profile data progressively while preserving the existing fallback demo data until each real flow is verified.

## References

[1]: https://supabase.com/docs/guides/database/secure-data "Supabase: Securing your data"
[2]: https://supabase.com/docs/guides/storage "Supabase: Storage documentation"
[3]: https://supabase.com/docs/guides/storage/security/access-control "Supabase: Storage access control"
[4]: https://supabase.com/docs/guides/auth "Supabase: Auth documentation"
