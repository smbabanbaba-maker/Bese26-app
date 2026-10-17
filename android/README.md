# Bese26 — Android / Google Play release preparation

**Status:** preparation only. Not yet a signed Android app or a Play Store submission.

## Existing app and proposed identity

- Canonical website / TWA origin: `https://www.bese26.shop/`
- Existing web manifest: `https://www.bese26.shop/manifest.webmanifest`
- Display name: `Bese26` (manifest full name: `Bese26 Marketplace`)
- **Proposed, not yet registered** Android package: `com.bese26.marketplace`
- Existing frontend: Vite + React; shared backend: Supabase.
- Android strategy: Trusted Web Activity (TWA) using Bubblewrap. The same website and backend remain in use.

## Repository audit, 17 October 2026

- [x] `public/manifest.webmanifest` exists with standalone mode, 192px and 512px icon entries.
- [x] `public/sw.js` exists; `src/main.jsx` registers it.
- [x] The frontend offers an install prompt.
- [x] Main web app uses the canonical `www.bese26.shop` origin.
- [ ] Validate live PWA installability, icon dimensions/maskability, offline fallback, and all user journeys on Android.
- [ ] Complete a working **Delete Account** workflow and public web deletion resource. `src/components/ProfileView.jsx` currently calls it unconnected.
- [ ] Expand a publicly accessible Privacy Policy and prepare accurate Play Console Data Safety declarations.
- [ ] Resolve Google Play Payments policy for **digital seller subscriptions and listing boosting**. Existing Paystack checkout cannot simply be exposed from a Play-distributed Android app for in-app digital features unless an applicable exception/program permits it. Physical-goods purchasing is different.
- [ ] Create a Google Play developer account, complete identity/device verification as applicable, and register a new app.
- [ ] Generate a TWA project, review its Android manifest and ensure `targetSdkVersion >= 36` for submissions starting 31 August 2026.
- [ ] Build and securely sign an Android App Bundle (`.aab`) and test APK.
- [ ] Publish a real Digital Asset Links file at `https://www.bese26.shop/.well-known/assetlinks.json` **only after** obtaining the right signing-certificate SHA-256 fingerprints. For Play-distributed versions, include the **Play App Signing app-signing certificate**, not just the upload certificate.
- [ ] Verify full-screen TWA association in the Play-installed build; if verification fails, browser UI may appear.
- [ ] Test signup/login/email redirects, product images, file uploads, messaging, push alerts, back navigation, deep links, privacy, account removal, support, seller restrictions, and payment routing.
- [ ] Complete Play Console app content, store graphics, screenshots, content rating, data safety, target audience, testing and production access.

## Steps to generate the Android project (developer workstation)

Use Node.js, Java, and the Android SDK on a trusted development computer.

```sh
npm install -g @bubblewrap/cli
mkdir -p android/twa
cd android/twa
bubblewrap init --manifest https://www.bese26.shop/manifest.webmanifest
```

During the interactive prompts, confirm the **exact** canonical `www` origin, app name, proposed package ID, icon assets, release version, and signing-key setup. Bubblewrap generates `twa-manifest.json` and an Android project in this directory. **Do not commit private signing keys or their passwords.**

Review the generated Android project and set/verify `targetSdkVersion >= 36`. Complete runtime testing and payment/deletion blockers **before** public release.

```sh
bubblewrap build
```

With a configured SDK and signing key, Bubblewrap generates a test APK and signed `.aab`. Treat the AAB as a test artifact until validation and Play app signing configuration are complete.

### Digital Asset Links

Once the Play app-signing certificate fingerprint is available in Play Console's App integrity / App signing section, generate or update Digital Asset Links for the production package. The essential site-side shape is:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.bese26.marketplace",
      "sha256_cert_fingerprints": ["REPLACE_WITH_REAL_PLAY_APP_SIGNING_SHA256"]
    }
  }
]
```

**Never deploy this example with a placeholder fingerprint.** Ensure the live endpoint returns JSON over HTTPS with status 200. Consider an additional local signing fingerprint when testing locally.

## Google Play developer account

Register at https://play.google.com/console/signup. One-time fee: USD 25 (card subject to acceptance).

- **Organization**: recommended if the Bese26 publisher is a legally registered company and can supply matching corporate details, business contact/website, and D-U-N-S number (typically free to request).
- **Personal**: requires identity and Android-device verification; new accounts generally need a closed test with 12 opted-in testers for 14 continuous days before applying for production access.

Never share Google password, OTP, payment card details, private keys, or keystore passwords in issues or chat.

## Release strategy and dependencies

1. **Release-blocker sprint**: account deletion, privacy/data declarations, billing-policy-compatible digital-plan path, runtime QA.
2. **Android packaging sprint**: Bubblewrap project, signing, API 36, assetlinks, Android testing.
3. **Google Play sprint**: developer verification, app listing, closed/internal testing, review and publish.

Do not merge this preparation branch expecting it to create a Play-ready Android app by itself.

References:
- Google Play signup: https://support.google.com/googleplay/android-developer/answer/6112435
- Required developer information: https://support.google.com/googleplay/android-developer/answer/13628312
- App account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play payments: https://support.google.com/googleplay/android-developer/answer/9858738
- Target API: https://support.google.com/googleplay/android-developer/answer/11926878
- TWA quick start: https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2
- Bubblewrap CLI: https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli
