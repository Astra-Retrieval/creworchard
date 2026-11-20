# Crew Orchard: waitlist and early-bird site

The pre-launch website for **Crew Orchard**, a product of **Astra Retrieval**. Visitors can join a free waitlist, or create an account at the lifetime early-bird price of $10 per seat, per month, with no charge until launch on **January 1, 2027**.

Built with Next.js 16 (App Router), Supabase (auth and database), and Stripe (subscriptions). Styling follows the Astra Retrieval Brand Guide v1.0.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Home: one-liner and a waitlist button |
| `/features` | Feature intentions, milestone timeline, and a "not a guarantee" disclaimer |
| `/pricing` | Four per-seat tiers (Early Bird and Waitlist highlighted) and FAQ |
| `/waitlist` | Toggle between the free waitlist form and early-bird account creation |
| `/signin` | Email and password sign-in for early-bird members |
| `/account` | Member dashboard: launch countdown, crew pass, telemetry, sign out, close account |
| `/admin` | Admins only: every early-bird member and waitlist entry, stats, and CSV export |

## Editing copy

All product copy, prices, the launch date, features, and milestones live in **`src/lib/site.ts`**.

## Run locally

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

The site runs without any keys. Forms show a "not connected yet" notice until Supabase and Stripe are configured.

## Connecting Supabase

1. Create a Supabase project and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
2. Apply `supabase/migrations/20261120000000_init.sql` (SQL editor, or `supabase db push`).
3. In Auth → URL Configuration, set the Site URL and add `<site>/auth/callback` as a redirect URL.
4. Create your own account through `/waitlist?plan=early_bird`, then promote it:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

## Connecting Stripe

1. Create the product and four prices (use a test key first):
   ```bash
   STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
   ```
   Paste the printed `STRIPE_PRICE_*` lines into `.env.local`.
2. Add a webhook endpoint at `<site>/api/stripe/webhook` for `checkout.session.completed` and `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`. Locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

### Sales tax

The product uses tax code `txcd_10103001` (SaaS, business use) and every price is tax-exclusive, so tax is added on top of the per-seat price. To start collecting:

1. In Stripe, open **Settings → Tax** and add your head office address (Stripe Tax shows "pending" until you do).
2. Add a registration under **Tax → Registrations** for each state where you're registered to collect tax. With no registrations, Stripe calculates $0 tax.
3. Set `STRIPE_AUTOMATIC_TAX=true` in Vercel and redeploy. Checkout then asks for a billing address and adds tax.

### How "no charge until launch" works

Early-bird Checkout creates a subscription with `trial_end` set to 2027-01-01 00:00 UTC and requires a card. Stripe bills the first month automatically when the trial ends. If someone signs up within 48 hours of launch (Stripe's minimum trial length), the trial is skipped and billing starts immediately.

## Data model

- `waitlist`: name, email (unique, case-insensitive), organization, use case, expected seats, notes, and an `invite_code` column to fill at launch. Server-only (RLS on, no policies).
- `profiles`: one row per auth user, created by a trigger. Holds role (`member` or `admin`), seats, a sequential member number, and Stripe IDs and status mirrored by the webhook. Members can read only their own row; all writes go through the server.
