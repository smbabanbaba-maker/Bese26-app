# Bese26 Profile account-center audit

## Scope

This change expands Profile into a structured account center while keeping the existing real Supabase marketplace source of truth and the fixed seven-item bottom navigation.

## Implemented real paths

The Profile page now reads authenticated profile identity, verification state, account type, location, bio, member year, seller rating, listings, sold listings, saved count, views, buyer inquiries, drafts, saved listings, reviews, notifications, profile contacts, and persisted preference settings. Profile photo selection, persistent avatar upload, replacement, and removal use the existing Supabase `avatars` storage bucket and `profiles.avatar_path`.

## Intentional unavailable paths

Saved searches, recently viewed history, business profiles, identity verification, reports, blocked users, wallet, subscriptions, boosting, payment history, support tickets, connected accounts, active sessions, and delete-account workflow are explicitly marked as not connected because the current Bese26 backend has no corresponding secure tables or action flow. No mock values or fake buttons are used for those areas.

## Local smoke check

At the unauthenticated local build, Profile opened from the fixed navigation without a blank state or runtime error. The account center rendered its real-data empty state (zero counters and sign-in prompt) and preserved the seven navigation labels Home, Wallet, Saved, Sell, Messages, AI, Profile. An authenticated profile/photo/settings flow still requires the persisted browser Supabase session for a full browser test.


## Live baseline

The public Vercel deployment currently still serves the previous Profile UI while the new Profile account-center changes remain local and uncommitted. The live baseline rendered Home and the fixed seven-item navigation successfully, and its Profile page showed the previous shorter sections. Deployment verification is intentionally deferred until the new code passes local tests and is pushed.


## Expanded local smoke check

The rewritten Profile route rendered all requested account-center groups on mobile: Marketplace, Seller Tools, Account, Preferences, Payments & Services, Trust & Safety, Support & Legal, and Account Actions. Unauthenticated counters remain zero and the UI shows a sign-in prompt rather than fabricated profile data. All visible cards are keyboard/clickable route entries, and unsupported areas are labeled as not connected instead of pretending to work.


## Supported subpage check

Help Center opened from the Profile menu and displayed five current marketplace FAQs with a working back control. The local browser console showed only the normal React DevTools information message and no runtime error.


## Final local route check

Returning from Help Center to Profile restored the full account-center view and fixed bottom navigation. The browser console again showed only the standard React DevTools information message.


## Final local quality gate

`npm run build` passed with initial JS `448.36 kB` (`128.17 kB gzip`), Profile route chunk `49.63 kB` (`13.88 kB gzip`), and CSS `106.69 kB` (`20.28 kB gzip`). `git diff --check` passed. The current browser measurement at `1280×1100` reported `documentWidth=1265`, `overflow=false`, and the fixed bottom navigation present. Exact 390×844 automated interaction was not available in this browser session; the existing mobile CSS and prior seven-item navigation check remain the reference for smaller widths.

## Backend changes

Applied to the authorized Supabase project `slxsbvuskgkacmtkkrmj`: `profile_preferences` with RLS and self-service grants, plus `profiles.account_type` with an allowlisted set of account types. No unrelated project was changed.


## Production verification

Commit `1b81cc4` is on GitHub `main`. Vercel served HTTP 200 with the new assets `index-CDo9pRnp.js` and `index-CTMfmZtE.css`. The deployed Profile route rendered the expanded Marketplace, Seller Tools, Account, Preferences, Payments & Services, Trust & Safety, Support & Legal, and Account Actions groups, with the fixed seven-item navigation still visible. The live session was unauthenticated, so it correctly showed zero counters and a sign-in prompt rather than private or fabricated data.


The production console check returned no output and no runtime error after loading the expanded Profile route.
