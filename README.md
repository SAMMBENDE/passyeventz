This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Rental, quote, and booking data

Mongoose models are defined in `src/models/`. Use the strict Zod schemas in
`src/lib/validation.ts` to validate untrusted server input before creating or
updating documents. Quote request validation intentionally accepts requested
services, not client-supplied prices; quote line-item prices must be resolved
and verified by server code. Booking validation checks date intervals, rental selections, and duplicate
items. `createBookingFromApprovedQuote` reserves stock transactionally: a
booking must use the exact rental SKUs and quantities on an approved quote,
prices are copied from that quote, and overlapping pending, confirmed, or
in-progress bookings reduce the available stock. A rental's inventory document
is updated within the transaction to serialize concurrent reservations.

Bookings can be created by an authenticated administrator from an approved quote
in the admin dashboard. The server resolves rental items from the quoted SKUs;
clients cannot choose rental prices or bypass the approved quote quantities.
Administrators can move bookings through pending, confirmed, in-progress, and
completed states, or cancel them. Status changes use conditional updates to
reject stale concurrent edits. There is no public booking write endpoint.
MongoDB must support transactions (as Atlas does). Pending bookings expire 24
hours after creation and no longer reserve inventory; expired bookings remain
visible in the admin history.

Vercel runs the expiration endpoint hourly using `vercel.json`. Configure
`CRON_SECRET` as a private random secret of at least 32 bytes in the deployment
environment (for example, generate one locally with `openssl rand -base64 32`).
The cron route rejects requests without its bearer token. Inventory checks and
admin booking actions also expire stale holds, so a delayed scheduled run does
not keep old pending bookings from consuming stock. An hourly schedule requires
a Vercel plan or external scheduler that supports hourly execution.

## Deposit payments

Administrators can create a hosted Stripe or PayPal link from each pending or
confirmed booking and copy it to send to the customer through their usual
channel. The server reads the deposit amount from the approved quote; clients
cannot choose the amount. Payment state changes only after a signed provider
webhook is verified. A valid late capture is refunded if its booking hold has
expired or the payment no longer matches the booking.

Configure these values in `.env.local` and the deployment environment:

- `APP_BASE_URL`: the public site URL, including `https://` in production.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID`.
- `PAYPAL_MODE`: `sandbox` for testing or `live` for production.

Register a Stripe webhook at
`https://<your-domain>/api/payments/stripe/webhook` for
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, and
`checkout.session.expired`. Register a PayPal webhook at
`https://<your-domain>/api/payments/paypal/webhook` for
`PAYMENT.CAPTURE.COMPLETED`, and set the resulting webhook ID as
`PAYPAL_WEBHOOK_ID`. Use the matching sandbox credentials and endpoints to
exercise the full create, pay, webhook, and refund paths before enabling live
payments. The public return page is informational; provider webhooks are the
source of truth for payment confirmation.

The hourly expiration job also expires payment links in the database. Stripe
checkout sessions have a matching provider expiry; PayPal orders that return
after the booking/payment deadline are not captured.

## Admin access

The admin area uses a single administrator account. Add these values to the
ignored `.env.local` file and configure the same values in the production
environment:

- `ADMIN_EMAIL`: the administrator's sign-in email.
- `ADMIN_PASSWORD_HASH`: run `npm run admin:hash-password` in a terminal to
  create a scrypt hash; the password is entered without being echoed.
- `ADMIN_SESSION_SECRET`: a private random secret of at least 32 bytes (for
  example, generate one locally with `openssl rand -base64 32`).

Restart the app after changing environment values. Sign in at `/admin/login`.
Sessions are signed, expire after eight hours, and use HttpOnly, SameSite
Strict cookies (Secure in production). The admin page checks the session on
the server; future admin APIs must independently call `requireAdminSession()`
before accessing or changing data. Only the `admin` role exists today.

The protected `/admin` dashboard loads the 50 newest quotes and live counts.
Admins can approve or reject submitted and revised quotes; the status update
is conditional on the current status to prevent stale concurrent changes.
Approving a quote makes it eligible for the server-side booking service.
Admins can edit event details, services, line items, and payment rates on
submitted/revised quotes. All totals are recalculated server-side; editing
returns the quote to `revised` and concurrent stale edits are rejected. Priced
quotes can be downloaded as a multipage PDF from the protected admin area.
PDFs are generated on demand and are not emailed or stored in MongoDB.

This minimal single-account implementation does not provide multi-factor
authentication or distributed login throttling. Put a rate limit in front of
the sign-in endpoint before exposing the admin site publicly; use a maintained
authentication provider if multiple users, auditability, or MFA are required.

Set `MONGODB_URI` in your ignored `.env.local` file before submitting quote
requests locally. `POST /api/quotes` validates each request and stores it in
MongoDB; connection failures are reported without exposing database details.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
