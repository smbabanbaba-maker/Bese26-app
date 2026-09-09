# Bese26 Checkout and Ordering Audit

## Executive finding

Bese26 currently has a strong conversation-first marketplace flow, but it does **not yet have a buyer checkout or order-management system**. A customer can open a listing, contact the seller, request a callback, start a protected conversation, make an offer, and plan a safe meeting. The customer cannot yet add an item to a cart, submit a formal order, select delivery or pickup, pay for the item, or track an order inside the app.

This is a reasonable and safer MVP position for a peer-to-peer marketplace, but the public storefront should not imply that customers can complete a normal e-commerce purchase until the order and payment workflow is implemented.

## What currently works

| Area | Current behavior | Assessment |
|---|---|---|
| Public storefront | Customers can browse a business profile and open listing details | Working |
| Listing details | Shows price, location, condition, seller information, call, WhatsApp, message, and offer actions | Working |
| Buyer conversation | Buyer can start a private conversation with the seller | Working |
| Offer flow | Buyer can submit an offer; the seller can accept, reject, or counter | Working |
| Safe meeting | Buyer and seller can propose and respond to a public meeting plan | Working |
| Seller callback | Buyer can request a callback | Working |
| Seller subscription payment | Paystack-related payment records exist for seller plans | Not buyer checkout |
| Listing boost payment | Paid promotion payment records exist for sellers | Not buyer checkout |
| Cart | No cart state or cart table exists | Missing |
| Buyer order | No order table or order status workflow exists | Missing |
| Delivery address | No checkout address collection exists | Missing |
| Buyer payment | No listing purchase payment initialization exists | Missing |
| Order tracking | No buyer order history or seller order queue exists | Missing |

## Current customer path

The current path is:

1. Customer opens a public storefront or listing.
2. Customer views the item, price, location, condition, and seller profile.
3. Customer contacts the seller through chat, phone, WhatsApp, or callback.
4. Customer may submit an offer.
5. Buyer and seller may agree on a safe public meeting.
6. Payment and handover happen outside the Bese26 order system.

This should be described as **Chat to buy** or **Request to buy**, not as a completed checkout.

## Recommended product direction

Bese26 is primarily a local, peer-to-peer marketplace with different seller types and delivery possibilities. The safest next step is not a large shopping-cart system immediately. The recommended rollout is a two-stage approach.

### Stage 1: Request to buy

Add a clear **Request to buy** action beside Message Seller and Make an Offer. It should open a short form with:

- Quantity, defaulting to one.
- Fulfilment choice: Pickup or Delivery if the seller supports it.
- General delivery area or pickup preference.
- Optional buyer note.
- A clear total estimate, marked as an estimate until the seller confirms delivery cost.

Submitting the form creates an order request with status `requested` and opens or creates the protected conversation. The seller receives a notification and can accept, decline, or request changes. No money is taken at this stage.

This gives Bese26 a real order workflow without pretending that payment, delivery, refunds, and disputes are already solved.

### Stage 2: Confirmed checkout

After the seller accepts the request, the buyer can continue to a checkout screen. The checkout should show:

- Item and seller.
- Quantity and item subtotal.
- Delivery or pickup method.
- Delivery fee, if confirmed.
- Platform fee, if Bese26 introduces one.
- Grand total.
- Buyer contact and delivery details.
- Safe Deal reminder.

Only after the buyer reviews the exact final amount should Paystack payment be initialized. Payment records must be tied to an order ID, not only a generic plan or reference.

## Recommended order statuses

The initial order state machine should be explicit:

`requested → accepted → awaiting_payment → paid → preparing → ready_for_pickup / out_for_delivery → completed`

Exceptional states should include:

- `declined`
- `cancelled_by_buyer`
- `cancelled_by_seller`
- `payment_failed`
- `disputed`
- `refunded`

Every status change should record who made the change and when. Buyers should never be able to mark an order as paid or completed from the client.

## Required database entities

A production checkout will need at least:

- `orders`: buyer, seller, listing, quantity, currency, item subtotal, delivery fee, total, fulfilment method, delivery details, status, timestamps.
- `order_events`: order status history and actor audit trail.
- `order_payments`: provider, reference, amount, status, verified timestamp, and refund information.
- Optional `order_items`: useful if a future cart supports multiple listings in one order.

Row-level security must ensure that only the buyer, seller, and approved administrative roles can read an order. Payment success must be verified server-side or by a trusted Supabase Edge Function/webhook before the order becomes `paid`.

## Storefront and app UI recommendation

For the public store and listing modal, use these actions in this order:

1. **Request to buy** — primary red action.
2. **Message seller** — secondary action.
3. **Make an offer** — secondary action for negotiable listings.
4. Call or WhatsApp — optional seller contact actions.

Until Stage 2 exists, the button should say **Request to buy**, not **Buy now** or **Checkout**, because those labels promise immediate payment and order confirmation.

For the seller Business Center, add an **Orders** area containing:

- New requests.
- Accepted orders awaiting payment.
- Paid orders to prepare.
- Pickup/delivery progress.
- Completed and cancelled history.

For the buyer Profile, add **My orders** with the same status labels and a clear conversation link for each order.

## Safety and operational requirements

Before enabling real buyer payments, Bese26 should define:

- Whether Bese26 holds funds or only records payment.
- Refund and cancellation rules.
- Delivery responsibility.
- What happens when an item is unavailable after payment.
- Dispute and moderation handling.
- Seller verification requirements for delivery orders.
- Whether the platform takes a fee.
- Payment webhook and reconciliation ownership.

Until these rules are implemented, the current Safe Deal flow—private chat, offer, and public meeting planning—is safer than adding an unverified direct-payment button.

## Final recommendation

Implement **Stage 1 Request to buy first**. It gives customers a recognizable ordering path, gives sellers a manageable order queue, and keeps Bese26 aligned with its local trust-and-safety model. After the request, seller confirmation, order records, payment verification, and cancellation/refund policy are ready, add the full Paystack checkout as Stage 2.

The current app is therefore suitable for **conversation-led buying**, but not yet for claiming that customers can complete a full checkout purchase inside a storefront.
