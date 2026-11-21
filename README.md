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

Signing in takes anyone with product access to `/app`, which opens their organization dashboard. Someone with no organization creates one and owns it.

**Organization** (`src/lib/org-rules.ts`)

- One **owner** (whoever created it), who can do everything. **Admins** can do everything except change the owner or other admins. **Members** can do only what they've been granted; today the one grantable permission is **Create projects** (add more to `ORG_PERMISSIONS`).
- **Seats**: everyone in the organization takes a seat. The owner and admins assign and unassign seats on the dashboard. The limit is the owner's plan (`profiles.seats`); it is unlimited while the owner is a Crew Orchard site admin or tester.
- The owner and admins see every project. Everyone else sees only the projects they've been added to.

**Project** (`src/lib/project-rules.ts`)

| Role | Can |
| --- | --- |
| Project lead | Add people from the organization, set roles, and everything below |
| Systems engineer | Create sub-systems and integrations, and everything below |
| Contributor | Edit documents and BoMs, assign people to sub-systems, pin documents |
| Viewer | Read only |

Whoever creates a project leads it. The organization's owner and admins act as a lead on every project. Each project has its own team, so one person can hold a different role on each.

**Project workspace** (`src/components/workspace/`)

- Tabs down the left (the list is `PROJECT_SECTIONS`): Canvas, Team, Documents, Bill of materials, Requirements, and Constraints. The last two are empty for now.
- **Canvas**: drag anywhere (or use the arrow keys) to move around. Sub-systems are boxes in a random brand color with a name and a short note. An integration connects two or more sub-systems: a smaller grey box joined to each by a grey line. The toggle at the top left switches lines between square (right angles only) and curved, and is remembered per device.
- **Selecting**: pressing a sub-system brightens it and turns its lines and integration boxes blue. Pressing an integration turns it and its lines blue and brightens its sub-systems. Either opens a panel on the right: people and their contact details (for an integration, grouped by sub-system), documents, and for a sub-system its bill of materials and any documents pinned to its sidebar.
- **Documents**: see "Word processor and version history" below.
- **Bills of materials**: each sub-system has a BoM; the Bill of materials tab adds them up into the project BoM.
- The **New** button (top right and bottom left) is shown to leads and systems engineers. The bottom-right row has user settings, feature requests, questions, and the organization dashboard. Feature requests and questions are saved to `contact_messages` and show up under Messages on `/admin`.

**Word processor and version history** (`src/components/workspace/RichEditor.tsx`, `DocumentEditor.tsx`, `src/lib/doc-content.ts`)

- Documents open in a built-in word processor (built on [Tiptap](https://tiptap.dev)): paragraph styles, fonts, sizes, bold, italic, underline, strikethrough, subscript, superscript, text color, highlight, alignment, line spacing, bulleted, numbered, and check lists, quotes, code, links, images by web address, tables, undo and redo, word count, and print.
- **Where a document is saved**: the project drive, one sub-system, or one integration. It is one document, shown everywhere above where it lives: a document saved in an integration also appears in each sub-system that integration connects, and everything appears in the project drive (the Documents tab). "Saved in" on the document moves it.
- **Versions**: saving works like a commit. Each save is a new numbered version with an optional note, the author, and the time. **History** lists them. **What changed** compares a version with the one before it, **Compare to now** compares it with the current document, and unsaved edits can be compared with the last save. **Restore** saves an old version again as the newest one, so nothing is ever deleted and a restore can be undone.
- If two people edit the same document, the second to save is told someone else saved first, rather than silently overwriting them.
- Comparison is on the text. Formatting-only changes are not listed.
- Content is stored as structured data (`documents.content`, `document_versions.content`), not HTML.

**Security**: these tables are server-only (RLS on, no policies). Every page and server action goes through the guards in `src/lib/orgs.ts`, which answer "page not found" to anyone who isn't allowed to see the organization or project. The hierarchy is also enforced by foreign keys: a project member must be in the organization, and a sub-system or integration member must be on the project, so unassigning a seat removes that person everywhere below.

Apply the migrations in `supabase/migrations/` in order before deploying.

## Data model

- `waitlist`: name, email (unique, case-insensitive), organization, use case, expected seats, notes, and an `invite_code` column to fill at launch. Server-only (RLS on, no policies).
- `profiles`: one row per auth user, created by a trigger. Holds role (`member` or `admin`), seats, a sequential member number, and Stripe IDs and status mirrored by the webhook. Members can read only their own row; all writes go through the server.
- `organizations`, `organization_members` (role and granted permissions), `projects`, and `project_members` (project role).
- `subsystems` (note, color, canvas position), `subsystem_members`, `integrations`, `integration_subsystems`, and `integration_members`.
- `documents` (project, sub-system, or integration drive), `document_versions` (every saved version), `subsystem_pins`, and `bom_items`. All server-only.
