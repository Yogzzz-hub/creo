# Razorpay recurring billing

New online onboarding creates a monthly Razorpay Plan and Subscription. Standard
Checkout receives `subscription_id`, rather than a one-time `order_id`. The
customer must authorize the recurring mandate in Razorpay. The mandate has 120
monthly cycles; Razorpay notifies the customer under its subscription rules.

Set these backend environment variables using the same Razorpay account and mode:

```dotenv
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_private_webhook_secret
```

Enable Subscriptions in the Razorpay account and configure a webhook at:

`https://creo-api-singapore.onrender.com/api/v1/webhooks/razorpay`

Subscribe to `subscription.charged`, `subscription.activated`,
`subscription.authenticated`, `subscription.paused`, `subscription.resumed`,
`subscription.halted`, `subscription.cancelled`, and `subscription.completed`.
Existing add-on order payments continue to use `payment.captured` / `order.paid`.

CREO verifies checkout signatures and reads the subscription and plan from Razorpay
before granting paid access. Mandate authorization without a paid billing cycle
does not complete onboarding. Renewals use Razorpay's confirmed period dates.
Duplicate webhook deliveries do not add extra paid days. Provider failures return
an error and leave the billing change unconfirmed.

Clients request a next-renewal pause from Account Settings or Plan & Billing.
Requests remain pending and AutoPay remains enabled. Administrators review these
in Manage Revenues → AutoPay pause approvals. Approval calls Razorpay's pause API
and verifies its status before saving the approval. Razorpay pauses billing now;
CREO preserves all access until the paid period ends. A pause remains in place
until the client explicitly resumes. No one-month automatic resumption is assumed.

Old offline or one-time subscriptions have no recurring mandate and cannot be
silently enrolled. Clients must authorize a new recurring checkout when eligible.
New client offline-claim submission cannot replace recurring onboarding. Historic
offline records and administrator review paths remain available.

Validation uses mocked Razorpay responses and a disposable PostgreSQL database.
No live mandates, charges or pauses are created by tests. Before onboarding live
customers, verify the authorization, first charge, renewal webhook and approved
pause in the merchant's Razorpay test environment.

References: [Subscriptions API](https://github.com/razorpay/razorpay-python/blob/master/documents/subscription.md),
[subscription signature verification](https://razorpay.com/docs/payments/subscriptions/integration-guide/).
