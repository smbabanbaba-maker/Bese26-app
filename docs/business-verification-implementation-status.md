# Bese26 business and verification implementation status

## Implemented in this change

The Sell flow now supports a real **Publish as** choice when the signed-in owner has a business profile in Supabase. The choice is either the personal account or the owner's business profile. Selecting the business identity auto-fills the business name and available business location without copying the business record into the listing form.

A new Supabase migration adds `business_profile_id` and `published_as_type` to `public.listings`. Personal listings remain the default for existing records. The listing creation RPC writes the business reference atomically, validates that the selected business belongs to the authenticated owner, and rejects an invalid or inactive business. Public listing hydration reads the explicit business reference, so a business badge is not inferred merely because a seller happens to have a business profile.

Listing drafts remain backend-only. The Sell page no longer stores marketplace drafts in `localStorage`; authenticated users save drafts to the existing `listing_drafts` table in Supabase. Unauthenticated users are prompted to sign in rather than receiving a false local persistence promise.

## Supabase migration required

Apply `supabase/migrations/20260903210000_business_listing_ownership.sql` to the Bese26 Supabase project before publishing business listings. The frontend build can compile before the migration is applied, but business publishing will not work until the new columns and RPC are present.

## Existing functionality reused

The repository already contains Supabase-backed profiles, one business profile per owner, private verification-document storage, verification applications and moderation, public business lookup, listing media storage, real conversations, favorites, reports, subscription entitlements, Paystack server verification, and business-profile editing.

## Remaining production blockers

The pasted specification asks for multiple businesses per user, business team membership and permissions, dedicated store verification, business-specific follower analytics, event-based business analytics, dynamic server-rendered SEO/Open Graph metadata, domain/DNS configuration for `bese26.shop`, a KYC/liveness provider, and additional management operations such as pause/resume/delete/renew. Those are not claimed as complete here because the current schema and deployment credentials do not expose a verified migration/application path for all of them. They require additional migrations, backend authorization functions, storage policies, and a production domain/provider setup.

No fake numbers, fake verification, public KYC documents, or automatic verification from payment were added.
