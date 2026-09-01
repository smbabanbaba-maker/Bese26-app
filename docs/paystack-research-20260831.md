# Paystack payment integration research — 2026-08-31

Sources:
- https://paystack.com/docs/payments/webhooks/
- https://paystack.com/docs/payments/subscriptions/
- https://paystack.com/docs/payments/verify-payments/
- https://paystack.com/docs/api/transaction/

Key findings:
- Paystack webhooks carry `x-paystack-signature`, an HMAC SHA512 signature of the event payload signed with the secret key. Validate it before processing.
- Webhook handlers must acknowledge with HTTP 200. Paystack retries unacknowledged events; live mode retries for up to 72 hours and test mode sends hourly for 10 hours.
- Paystack subscriptions use a plan created in the dashboard or Plan API. A plan has name, monthly interval, and amount in currency subunit. Passing the plan code during transaction initialization creates the recurring subscription after the customer pays.
- Subscription events include `subscription.create`, `charge.success`, `invoice.create`, `invoice.payment_failed`, `invoice.update`, `subscription.not_renew`, and `subscription.disable`.
- The Verify Transaction API is a server-side GET by reference. Transaction status is `response.data.status`, not the top-level API response status. Webhooks are preferred for successful transaction confirmation, but verify should also be used from the redirect flow.
- Initialize Transaction must be done from the backend with the secret key; amount is in the currency subunit, and `plan` can contain the Paystack plan code. The callback URL should be fully qualified.

Application mapping:
- Bese26 already has server routes for initialize, verify, and webhook under `/api/paystack`.
- Business launch price is NGN 14,999/month, so Paystack amount is 1,499,900 kobo.
- Never activate Business access from frontend redirect alone; update Supabase only after server-side reference, amount, currency, user, metadata, and webhook/verify checks.
