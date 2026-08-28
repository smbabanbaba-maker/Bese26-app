# Paystack integration notes

Paystack official documentation confirms that transaction initialization should happen from a backend using the secret key; the secret key must not be placed in frontend code. The frontend can receive an authorization URL or access code from the backend and open checkout. Payment fulfillment must wait for server-side verification of both transaction status and amount.

Paystack recommends webhooks for status updates. Webhook requests include `x-paystack-signature`, which is an HMAC SHA512 signature of the request payload signed with the secret key. The endpoint should validate the signature before processing. The endpoint should acknowledge quickly with HTTP 200; failed acknowledgements can be retried for up to 72 hours in live mode. Relevant events include `charge.success`, `subscription.create`, `subscription.disable`, and `subscription.not_renewing`.

For Bese26, the safe boundary is: `PAYSTACK_SECRET_KEY` stays server-side in a Vercel server environment variable; only a Paystack public key, if needed by a client-side checkout library, may be exposed to the browser. The server should initialize a transaction with the selected plan amount in kobo, a unique reference, user/plan metadata, and callback URL; verify the returned reference server-side; and update `seller_subscriptions` only after a successful status/amount/reference check. The webhook should be idempotent so duplicate events do not create duplicate entitlements. No live key or test key has been stored in this file.

References:

1. Paystack Webhooks: https://paystack.com/docs/payments/webhooks/
2. Paystack Accept Payments: https://paystack.com/docs/payments/accept-payments/
3. Paystack Verify Payments: https://paystack.com/docs/payments/verify-payments/
Paystack's subscription documentation confirms the recurring flow: create a monthly plan, attach its plan code to the initial transaction, then listen for `subscription.create`, `charge.success`, `invoice.create`, `invoice.payment_failed`, `invoice.update`, `subscription.not_renew`, and `subscription.disable`. Paystack states that Card and Direct Debit (Nigeria) are supported for recurring subscriptions. Plan amounts are sent in the currency subunit; for NGN this means kobo. The plan code and recurring state should be stored server-side and mapped to the Bese26 plan key.

4. Paystack Subscriptions: https://paystack.com/docs/payments/subscriptions/
Implementation status: Bese26 now contains server-side Vercel routes at `/api/paystack/initialize`, `/api/paystack/verify`, and `/api/paystack/webhook`. The frontend sends only the authenticated Supabase access token and plan key. The server keeps `PAYSTACK_SECRET_KEY` private, initializes the configured monthly plan, verifies the reference/amount/currency/user metadata, validates webhook HMAC SHA512, and updates the owner entitlement/payment ledger idempotently.

The current code supports Basic (`₦4,999`), Premium (`₦9,999`), and Business (`₦29,999`) monthly plans. Before a real paid checkout can succeed, Vercel must have `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_BASIC_PLAN_CODE`, `PAYSTACK_PREMIUM_PLAN_CODE`, and `PAYSTACK_BUSINESS_PLAN_CODE` in addition to `PAYSTACK_SECRET_KEY`. Those values are not stored in the repository. Build and Node syntax checks passed after the integration; the code is ready for deployment once the missing environment configuration is added.
Production verification: Vercel served the new frontend asset fingerprint for commit 298919c with HTTP 200. `GET /api/paystack/webhook` correctly returned HTTP 405, and an unauthenticated `POST /api/paystack/initialize` correctly returned HTTP 401 without contacting Paystack or creating a charge. The production browser console had no output/errors. No real payment was initiated in this test.
