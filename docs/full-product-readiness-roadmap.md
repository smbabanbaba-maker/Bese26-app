# Bese26 Full Product Readiness Roadmap

## Executive assessment

Bese26 has reached a strong marketplace MVP. The core journey—discover listings, open a product, save it, contact a seller, publish a listing, create a Business mode, and share a public mini-store—is present. The latest production build passes successfully, and the repository is clean at commit `85788f0`.

The next stage should not focus on adding many new features. The highest-value work is to make the current product operationally real, reduce friction for first-time users, and validate the complete buyer, seller, and moderator journeys against the production Supabase project.

## Current product coverage

| Area | Current state | Assessment |
|---|---|---|
| Home and marketplace discovery | Implemented with truthful empty states | Ready for beta after production data/configuration |
| Search and categories | Implemented | Good MVP coverage |
| Listing details and save flow | Implemented | Needs end-to-end testing with real records |
| Listing publishing | Implemented with moderation boundary | Ready after storage, categories, and RLS verification |
| Draft listings | Implemented | Needs real-account testing |
| Messages and chat | Implemented for authenticated users | Needs attachment, notification, and two-user testing |
| Offers and safe meeting plans | Implemented | Needs policy and abuse testing |
| Personal profiles and trust | Implemented | Needs real profile-data testing |
| Business mode | Implemented within one account | Good direction; simplify the first screen further |
| Public Business Directory | Implemented | Requires production migration and public-policy verification |
| Public mini-store | Implemented | Requires domain, routing, SEO, and production-data verification |
| Business and identity verification | Backend/UI workflow exists | Must be tested with moderator and applicant accounts |
| Admin moderation | Implemented | Must be tested with a real admin account |
| Notifications | Real recipient-scoped workflow exists | Must be tested with Realtime and email/push expectations clearly defined |
| Wallet | Truthfully unavailable | Keep hidden from primary user actions until ledger/payment exists |
| Online orders and checkout | Not implemented | Phase 2, not a launch blocker for a local chat-first MVP |
| Phone OTP | Not fully connected | Do not display phone-verified status until a real provider is configured |
| Support tickets | Not fully connected | Keep as a clear help/contact placeholder or build a small ticket workflow |

## Priority 0: production configuration and launch blockers

### 1. Configure the real Supabase project

The local browser correctly shows a configuration warning when Supabase variables are absent. Before launch, configure the production deployment with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Confirm that Auth, Storage, Realtime, database access, and all required buckets are enabled.

The `.env.example` contains server-side values such as service-role and Paystack secrets. Those must remain server-side and must never be exposed in the Vite client bundle.

### 2. Apply and verify every migration

The latest migrations include business security, identity verification, chat deal workflows, public storefronts, business listing ownership, and related RLS policies. Apply them in the authorized production Supabase project and verify the resulting tables, policies, functions, indexes, and Realtime publication.

The two most relevant latest migrations are:

- `20260904220000_secure_business_center_verification.sql`
- `20260904230000_public_business_storefronts.sql`

Do not assume that a migration file in GitHub has been applied to Supabase. The live database must be checked separately.

### 3. Choose and standardize the canonical domain

The code and public-store experience use `bese26.shop`, while `.env.example` still uses `https://bese26-app.vercel.app`. Select one canonical public domain and use it consistently for:

- Public store links
- Product links
- Auth callback and redirect URLs
- Google OAuth configuration
- Paystack callback URLs
- Open Graph and social-share metadata
- Canonical URLs and sitemap entries

Until this is standardized, links shared by sellers may work inconsistently across environments.

### 4. Run a three-account production smoke test

Use separate real test accounts for:

1. A buyer: register, search, open a public store, save a listing, message a seller, make an offer, and return from login to the original product/chat.
2. A seller: create a listing, upload images, save a draft, publish for moderation, create Business mode, share the store, publish as Business, and receive a message.
3. A moderator/admin: approve, reject, request changes, review business verification, review identity verification, and confirm seller notifications.

This test is more important than adding another feature.

## Priority 1: make the first-time user journey easier

### 1. Add a clear first-visit choice

The first screen should make the two main actions obvious:

- **I want to buy**
- **I want to sell**

Keep Explore listings as the primary default, but make the seller path visible without requiring the user to understand the bottom navigation first.

### 2. Add a short onboarding guide after registration

After account creation, show a small three-step checklist:

- Complete profile
- Save or browse a listing
- Post your first item

Do not force a long tutorial. Use a dismissible card that can be resumed from Profile.

### 3. Keep registration contextual

When a guest clicks Message Seller, show the exact reason for registration:

> Create a free account to message this seller. We will return you to this product after sign-in.

Preserve the product ID and intended action through email login, signup, and Google login. This is one of the most important conversion paths.

### 4. Reduce navigation overload

The current Profile page exposes many account-center sections. This is useful for completeness but can overwhelm new users. Keep the current sections, but group them visually into three prominent blocks first:

- Buying and selling
- Business and trust
- Account and settings

Move lower-frequency options such as Wallet, Boosting, Payment History, and Support lower on the page or behind **More settings** until they are fully operational.

## Priority 1: seller usability

### 1. Make Sell a short guided flow

The existing three-step Sell flow is the correct direction. Keep the order:

1. Photos
2. Details and price
3. Location, contact, and publish

Add a persistent summary at the top showing the listing title, price, and selected seller identity. The user should always know whether the listing is being published as Personal or Business.

### 2. Improve first-listing guidance

When the seller has no listings, explain exactly what to do:

> Add a clear photo, a searchable title, one price, and your location. Your listing will be reviewed before it appears publicly.

This is better than presenting a large empty form without context.

### 3. Make moderation status visible

Every seller listing should have one simple status label:

- Draft
- Submitted for review
- Approved
- Changes requested
- Rejected
- Sold

When changes are requested, show the moderator reason beside the edit button.

### 4. Protect sellers from accidental public data exposure

Keep exact address, phone, and WhatsApp hidden by default. Continue requiring an explicit public-contact choice. Confirm this with real public-store tests using both enabled and disabled contact settings.

## Priority 1: Business usability and trust

### 1. Keep the one-account/two-modes model

Do not create a separate Business account. The current approach is simpler and should remain:

> One account, two modes: Personal and Business.

### 2. Make the Business Center outcome-first

The first Business screen should lead with:

- Store is ready or Setup store
- View store
- Copy link
- Share on WhatsApp
- Add first listing
- Verification status

Optional business fields should remain below the first screen.

### 3. Explain verification clearly

Use three distinct states:

- **Active store:** public and discoverable, but not verified
- **Verification pending:** documents submitted and under review
- **Verified:** verified badge visible

Never make users think that creating a store automatically means the business is verified.

### 4. Add handle suggestions

If a public handle is taken, suggest alternatives such as:

- `name-kano`
- `name-ng`
- `name-2026`

The current availability check is useful; suggestions are the next small usability improvement.

## Priority 1: trust, safety, and moderation

### 1. Publish a plain-language safety rule

Show a short warning near chat and offers:

> Do not send passwords, OTP codes, or full payment before confirming the seller and deal details.

### 2. Add report entry points everywhere users need them

A user should be able to report from:

- Listing details
- Public Business store
- Seller profile
- Conversation
- Offer or meeting plan

### 3. Test blocked-user behavior

Verify that a blocked pair cannot create or read a conversation, and that the UI explains the result without exposing private information.

### 4. Define moderator operating rules

Before public launch, document who can approve listings, who can approve verification, what evidence is required, and how appeals are handled. Security policies alone do not define a complete moderation operation.

## Priority 2: things to keep truthful but defer

### Wallet

Keep the current unavailable state. Do not show balances, transactions, deposits, or withdrawals until there is a real ledger, reconciliation process, payout flow, refund policy, and audit trail.

### Online checkout and orders

Defer cart, checkout, escrow, delivery tracking, refunds, and seller payouts until the chat-first marketplace has enough validated usage. These features create financial and support obligations.

### Phone OTP

Do not label a user phone-verified until an actual OTP provider and recovery process are configured.

### Support tickets

Either keep Contact Support clearly marked as not connected or build a small ticket system with ticket ID, status, replies, and admin ownership. Avoid a button that appears to submit support but does nothing.

### Attachments

Add chat attachments after the text chat and offer flow is stable. Use private Storage policies, file-size limits, MIME validation, and malware/abuse review where appropriate.

## Small but high-value polish

- Add Open Graph image and title for every public Business store.
- Add a custom not-found state for invalid store and listing links.
- Add a `Copy link` confirmation that works on browsers without Clipboard API support.
- Add loading skeletons for Business Directory, listings, and chat instead of blank waits.
- Make every error actionable: explain what happened and what the user can do next.
- Verify mobile layout at 320px, 360px, 390px, and 430px widths.
- Check keyboard focus, modal Escape behavior, button labels, and color contrast.
- Compress oversized public images and provide responsive image sizes. The repository currently contains several large image assets; this will affect mobile loading.
- Add a lightweight error-monitoring solution before inviting many users.
- Add a privacy-conscious analytics event plan for search, listing view, message start, store view, and publish completion.

## Recommended release sequence

### Release 1: operational beta

1. Configure production Supabase and Vercel environment variables.
2. Apply and verify all migrations.
3. Standardize `bese26.shop` and callback URLs.
4. Run buyer, seller, and moderator end-to-end tests.
5. Fix any RLS, Storage, Auth, Realtime, or deep-link failures.
6. Invite a small group of real testers.

### Release 2: usability improvements

1. Add first-visit buy/sell choice.
2. Add contextual registration copy and return-state testing.
3. Simplify Profile grouping.
4. Add handle suggestions.
5. Add clearer listing moderation status.
6. Improve loading, error, empty, and offline states.

### Release 3: trust and scale

1. Add support tickets.
2. Add chat attachments.
3. Add stronger moderation tooling and appeals.
4. Add SEO/share metadata and performance optimization.
5. Add analytics and error monitoring.

### Release 4: transactions

Only after the local marketplace behavior is validated:

1. Orders and checkout
2. Payment verification
3. Escrow or protected payment
4. Seller payouts
5. Refunds and disputes
6. Delivery tracking
7. Wallet and transaction history

## Final recommendation

The app should now enter a **controlled beta preparation phase**, not a feature-expansion phase. The most important work is to set the production environment, verify the database and policies, unify the domain, and test the real journeys. After that, simplify the first-time experience and only then add support, attachments, or payments.

The product is already capable of being useful as a chat-first local marketplace with public Business stores. Its main risk is not lack of features; it is launching before the live configuration, security policies, and user journeys have been verified end to end.

## Audit evidence

- Latest repository commit: `85788f0`
- Latest production build: passed with Vite
- Repository status: clean at audit time
- Current public navigation: Home, Saved, Sell, Messages, Business, Profile
- Current unavailable area: Wallet is truthfully marked as coming soon
- Current environment template: `.env.example` exists, but live deployment configuration must be verified separately
