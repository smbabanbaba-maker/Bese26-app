# Bese26 Paystack setup

The Bese26 frontend never receives the Paystack secret key. The secure checkout handlers run under Vercel serverless routes.

## Vercel environment variables

Add these to the Bese26 Vercel project. Choose **Secret** for the two key values and **Config** is acceptable for the non-secret URLs and plan codes.

| Name | Type | Value |
| --- | --- | --- |
| `PAYSTACK_SECRET_KEY` | Secret | Paystack Test Secret Key beginning `sk_test_...` during testing; use `sk_live_...` only after go-live checks |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | The service-role key for the authorized Bese26 Supabase project; never paste it into chat or GitHub |
| `PAYSTACK_BASIC_PLAN_CODE` | Config | Paystack monthly Basic plan code, for example `PLN_...` |
| `PAYSTACK_PREMIUM_PLAN_CODE` | Config | Paystack monthly Premium plan code |
| `PAYSTACK_BUSINESS_PLAN_CODE` | Config | Paystack monthly Business plan code |
| `APP_URL` | Config | `https://bese26-app.vercel.app` |
| `PAYSTACK_CALLBACK_URL` | Config | `https://bese26-app.vercel.app/?payment=paystack` |

Use **Production** for the production deployment. Add the same non-live values to **Preview** only when testing preview deployments. Keep Test Secret Key in Preview/Development and do not mix it with Live keys.

## Paystack dashboard setup

In Paystack Test Mode, create three monthly plans using these amounts: Basic `₦4,999`, Premium `₦9,999`, and Business `₦29,999`. Copy only each returned plan code into its matching Vercel Config variable. Do not put a plan code in the secret-key field.

In **Settings → API Keys & Webhooks**, set the Test Webhook URL to:

`https://bese26-app.vercel.app/api/paystack/webhook`

The callback URL is already sent by the server, but it is also safe to set the same callback URL in the dashboard.

## Secure flow

A signed-in user clicks a paid plan. Bese26 sends the user session token to `/api/paystack/initialize`. The server validates the user and plan, creates a unique reference, initializes Paystack with the plan code, and returns only a checkout URL. After checkout, Bese26 verifies the reference server-side and Paystack sends a signed webhook. The webhook validates `x-paystack-signature` before updating the payment ledger and `seller_subscriptions`.

No payment should be treated as successful from a browser callback alone. Access is granted only after server-side status, amount, currency, user metadata, and reference checks pass.
