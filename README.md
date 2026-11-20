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
| `/app` | The product. Sends you to your organization (or asks you to create one) |
| `/app/org/[orgId]` | Organization dashboard: projects, members, and permissions |
| `/app/org/[orgId]/project/[projectId]` | A project: the canvas, plus Documents, Requirements, and Constraints tabs |

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

1. Create a Supabase project and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`), and `SUPABASE_SECRET_KEY` (`sb_secret_...`) from Project Settings → API Keys. The older `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` names are still read as a fallback.
2. Apply `supabase/migrations/20261120000000_init.sql` (SQL editor, or `supabase db push`).
3. In Auth → URL Configuration, set the Site URL to the exact public address (for example `https://www.creworchard.com`) and add `<site>/**` as a redirect URL.
4. In Auth → Emails → Templates, change the link in two templates so email links work in any browser:
   - **Confirm signup:** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account`
   - **Reset password:** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
5. Create your own account through `/waitlist?plan=early_bird`, then promote it:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

### Email templates

Branded HTML for every Supabase auth email lives in `supabase/templates/`. Each link points at `/auth/confirm` with a one-time `token_hash`, so links work in any browser. In Supabase → **Authentication → Emails → Templates**, open each template, set the subject, switch the body to source/HTML, and paste the whole file:

| Supabase template | File | Subject |
| --- | --- | --- |
| Confirm signup | `confirmation.html` | Confirm your email for Crew Orchard |
| Reset password | `recovery.html` | Reset your Crew Orchard password |
| Magic link | `magic_link.html` | Your Crew Orchard sign-in link |
| Change email address | `email_change.html` | Confirm your new email for Crew Orchard |
| Invite user | `invite.html` | You're invited to Crew Orchard |
| Reauthentication | `reauthentication.html` | Your Crew Orchard verification code |

The logo is served from `public/email/crew-orchard-logo.png` (PNG, because Gmail and Outlook don't show SVG). To change the wording, edit `scripts/build-email-templates.py` and run `python3 scripts/build-email-templates.py supabase/templates`.

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

## Product access (/app)

The product lives under `/app`, behind one access rule (`src/lib/product-access-rules.ts`):

| Who | Before launch | After launch |
| --- | --- | --- |
| Admins | ✅ | ✅ |
| Testers (toggle per member on `/admin`) | ✅ | ✅ |
| Members with an active or trialing subscription | ❌ "page not found" | ✅ |
| Members without an active subscription | ❌ "page not found" | ❌ "Your seat isn't active" |
| Signed-out visitors | ❌ "page not found" | ➡️ sent to sign in |

The **Product access** card on `/admin` sets the mode: **Automatic** (the default) opens at launch, 2027-01-01 00:00 UTC. **Open now** and **Keep closed** are manual overrides. The mode is stored in the `app_settings` table, and the tester flag is `profiles.is_tester`. Run `npm test` to check the rule against every case.

## Organizations and projects

Signing in takes anyone with product access to `/app`, which opens their organization dashboard. Someone with no organization creates one and becomes its first admin.

- **Permissions** (`src/lib/org-rules.ts`): organization admins can do everything. Members can do only what an admin has granted them on the dashboard. Today there is one grantable permission, **Create projects**; add more to `ORG_PERMISSIONS`. Managing members is admin-only, and an organization always keeps one admin.
- **Project workspace** (`src/components/workspace/`): a full-screen view with tabs down the left (the list is `PROJECT_SECTIONS`), a canvas as the main page, a **New** button top right and bottom left that creates a sub-system or an integration between two sub-systems, and a bottom-right row for user settings, feature requests, questions, and the organization dashboard.
- **Feature requests and questions** are saved to `contact_messages` and show up under Messages on `/admin`.
- **Security**: these tables are server-only (RLS on, no policies). Every page and server action goes through the guards in `src/lib/orgs.ts`, which answer "page not found" to anyone outside the organization.

Apply `supabase/migrations/20261120230000_organizations_projects.sql` before deploying this code.

## Data model

- `waitlist`: name, email (unique, case-insensitive), organization, use case, expected seats, notes, and an `invite_code` column to fill at launch. Server-only (RLS on, no policies).
- `profiles`: one row per auth user, created by a trigger. Holds role (`member` or `admin`), seats, a sequential member number, and Stripe IDs and status mirrored by the webhook. Members can read only their own row; all writes go through the server.
- `organizations`, `organization_members` (role and granted permissions), `projects`, `subsystems` (with canvas position), and `integrations` (a link between two sub-systems of the same project, one per pair). All server-only.
