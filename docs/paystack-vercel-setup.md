# Bese26 Paystack setup

The Bese26 frontend never receives the Paystack secret key. Secure checkout handlers run under Vercel serverless routes.

## Payment model

Bese26 uses **one-time monthly payments**, not recurring Paystack subscriptions. A customer pays for one month of access and manually pays again when the plan expires. This allows Paystack checkout to show the payment channels enabled for the account, such as Card, Transfer, Bank, USSD, OPay, and Zap.

The server still records the paid period in `seller_subscriptions`, but it does not attach a Paystack recurring plan code or automatic renewal.

## Vercel environment variables

Add these to the Bese26 Vercel project. Choose **Secret** for the key values and **Config** is acceptable for the non-secret URL values.

| Name | Type | Value |
| --- | --- | --- |
| `PAYSTACK_SECRET_KEY` | Secret | `sk_live_...` for the live deployment; use `sk_test_...` only in a separate test/preview environment |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | The service-role key for the authorized Bese26 Supabase project; never paste it into chat or GitHub |
| `APP_URL` | Config | `https://www.bese26.shop` |
| `PAYSTACK_CALLBACK_URL` | Config | `https://www.bese26.shop/?payment=paystack` |

The old `PAYSTACK_BASIC_PLAN_CODE`, `PAYSTACK_PREMIUM_PLAN_CODE`, and `PAYSTACK_BUSINESS_PLAN_CODE` variables are no longer required for the one-time flow. They can be removed from Vercel after the new deployment is active.

Use **Production** for the live deployment. Keep live and test keys in separate environments and never mix them.

## Paystack dashboard setup

You do not need to create recurring Paystack plans for the Bese26 subscription page. The Bese26 server sends the selected one-time amount directly:

- Basic: `₦2,500`
- Premium: `₦4,500`
- Business: `₦7,000`

In the Paystack Live dashboard, enable the payment channels available to your account. The checkout will show channels such as Card, Transfer, Bank, USSD, OPay, and Zap when Paystack makes them available for the transaction/account.

In **Settings → API Keys & Webhooks**, set the Live Webhook URL to:

`https://www.bese26.shop/api/paystack/webhook`

The callback URL is sent by the server, but it is also safe to set the same callback URL in the dashboard.

## Secure flow

A signed-in user chooses a plan. Bese26 sends the selected plan key to `/api/paystack/initialize`. The server validates the user, maps the plan to the fixed amount, creates a unique reference, and initializes a **one-time** Paystack transaction without a recurring plan code. Paystack returns a checkout URL with the enabled payment channels.

After checkout, Bese26 verifies the reference server-side and Paystack sends a signed webhook. The webhook validates `x-paystack-signature` before marking the payment successful and activating the selected plan for one month.

No payment is treated as successful from a browser callback alone. Access is granted only after server-side status, amount, currency, user metadata, and reference checks pass.
