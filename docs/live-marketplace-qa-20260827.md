# Bese26 live marketplace QA — 2026-08-27

The cache-busted production URL `https://bese26-app.vercel.app/?v=33afa22` served the latest build after commit `33afa22`. The Home screen rendered successfully with the fixed bottom navigation. The Profile screen rendered the new signed-out state (`Your bese26 profile`, `Sign in to personalize your profile`, and a Sign in action) rather than the previous hardcoded identity. Sell rendered as one continuous vertical form with photo upload, category-aware fields, pricing, location, contact, and publish sections. Messages rendered the conversation list, active thread, listing context, composer, and send controls. Saved rendered the shortlist and saved-search sections.

The current visible screens still contain demo/local marketplace data in several areas, and SMTP/Email OTP delivery remains intentionally paused for later. No claim is made here that an authenticated session, real email delivery, listing publishing, or two-account chat has been completed end-to-end.

The AI screen rendered with prompt suggestions and a composer. The Wallet screen rendered with the existing demo balance/activity and correctly exposed its current demo actions. These screens did not blank or produce a visible runtime error during navigation.

The password-auth revert was deployed and verified at `https://bese26-app.vercel.app/?v=d033681`. The live authentication panel now shows Email, Password, Sign in, and the Create account switch, with no OTP-only controls. Production build and `git diff --check` passed before the push.
