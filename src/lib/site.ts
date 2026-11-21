/**
 * Single source of truth for product copy, launch timing, and pricing.
 * Edit this file to change what the site says without touching layout code.
 */

export const PRODUCT_NAME = "Crew Orchard";
export const PARENT_COMPANY = "Astra Retrieval";
export const PARENT_URL = "https://astraretrieval.com";

/** One-liner shown on the home page hero. */
export const ONE_LINER =
  "The backend system for engineers: it runs the systems behind your work so you can focus on whatever you are building.";

/** Supporting sentence under the one-liner. */
export const SUB_LINE =
  "Bring your project, your tools, and your crew. Crew Orchard keeps it all running underneath.";

/** Launch: product goes live and early-bird billing starts. 00:00 UTC. */
export const LAUNCH_DATE_ISO = "2027-01-01T00:00:00Z";
export const LAUNCH_DATE = new Date(LAUNCH_DATE_ISO);
export const LAUNCH_LABEL = "January 1, 2027";
/** Unix seconds, used for Stripe `trial_end` so nobody is charged before launch. */
export const LAUNCH_UNIX = Math.floor(LAUNCH_DATE.getTime() / 1000);

/**
 * Early-bird sign-ups close at 6:00 PM Eastern on December 29, 2026.
 * Stripe needs a free trial to last at least 48 hours, and billing is deferred
 * to launch (Jan 1 00:00 UTC) only while launch is more than 49 hours away
 * (see billingStartsAtLaunch in src/lib/checkout.ts). Closing here guarantees
 * every early bird gets the free trial and is first charged at launch.
 */
export const EARLY_BIRD_CLOSES_ISO = "2026-12-29T23:00:00Z";
export const EARLY_BIRD_CLOSES = new Date(EARLY_BIRD_CLOSES_ISO);
export const EARLY_BIRD_CLOSES_LABEL = "December 29 at 6:00 PM ET";
export const EARLY_BIRD_CLOSES_SHORT = "Dec 29";

export function isEarlyBirdOpen(now: number = Date.now()): boolean {
  return now < EARLY_BIRD_CLOSES.getTime();
}

/** Message shown wherever early-bird sign-up is attempted after the cutoff. */
export const EARLY_BIRD_CLOSED_MESSAGE = `Early-bird sign-ups closed on ${EARLY_BIRD_CLOSES_LABEL}. Join the waitlist and we'll email you a code at launch.`;

export type TierId = "early_bird" | "waitlist" | "academic" | "enterprise";

export interface Tier {
  id: TierId;
  name: string;
  price: number; // USD per seat per month
  tag: string;
  blurb: string;
  points: string[];
  highlighted: boolean;
  cta: { label: string; href: string };
  /** Name of the env var that holds this tier's Stripe Price ID. */
  priceEnv: string;
}

export const TIERS: Tier[] = [
  {
    id: "early_bird",
    name: "Early Bird",
    price: 10,
    tag: "Lifetime price",
    blurb: "Create an account today and lock in the lowest price for life.",
    points: [
      "$10 per seat, per month, for life",
      `No charge until launch on ${LAUNCH_LABEL}`,
      "Cancel any time before launch and pay nothing",
      "Early-bird member number and first access",
    ],
    highlighted: true,
    cta: { label: "Claim early bird", href: "/waitlist?plan=early_bird" },
    priceEnv: "STRIPE_PRICE_EARLY_BIRD",
  },
  {
    id: "waitlist",
    name: "Waitlist",
    price: 15,
    tag: "Code at launch",
    blurb: "Join the waitlist now and register with the code we send you at launch.",
    points: [
      "$15 per seat, per month",
      "Registration code emailed at launch",
      "No card needed to join the list",
      "Product updates on the way to launch",
    ],
    highlighted: true,
    cta: { label: "Join the waitlist", href: "/waitlist" },
    priceEnv: "STRIPE_PRICE_WAITLIST",
  },
  {
    id: "academic",
    name: "Academic & Hobby",
    price: 25,
    tag: ".edu or hobbyist",
    blurb: "For students, researchers with a .edu address, and hobbyist projects.",
    points: [
      "$25 per seat, per month",
      "Verified .edu email, or a hobbyist-use agreement",
      "Full feature set",
      "Non-commercial use",
    ],
    highlighted: false,
    cta: { label: "Available at launch", href: "/waitlist" },
    priceEnv: "STRIPE_PRICE_ACADEMIC",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 40,
    tag: "Commercial",
    blurb: "For companies and teams building commercially.",
    points: [
      "$40 per seat, per month",
      "Commercial use",
      "Priority support",
      "Advanced admin and security controls",
    ],
    highlighted: false,
    cta: { label: "Available at launch", href: "/waitlist" },
    priceEnv: "STRIPE_PRICE_ENTERPRISE",
  },
];

export const EARLY_BIRD = TIERS[0];

/** Short display headline for the home hero (Michroma, caps). */
export const HEADLINE = "The backend for whatever you build.";

export type Category = "core" | "integrations" | "team" | "ai";

export interface Feature {
  category: Category;
  title: string;
  body: string;
}

/** Feature intentions. These are plans, not promises (see the disclaimer on /features). */
export const FEATURES: Feature[] = [
  {
    category: "core",
    title: "One home for your project",
    body: "Data, files, notes, and decisions live in one place instead of scattered across drives, chats, and spreadsheets.",
  },
  {
    category: "integrations",
    title: "Works with your tools",
    body: "Connect the tools you already use and reach everything through an API, so Crew Orchard fits around your workflow.",
  },
  {
    category: "team",
    title: "Built for your crew",
    body: "Shared workspaces with roles and permissions, priced per seat, so everyone on the project works from the same source.",
  },
  {
    category: "core",
    title: "Full history",
    body: "Every change is versioned, so you can see what changed, who changed it, and roll back when you need to.",
  },
  {
    category: "integrations",
    title: "Automations",
    body: "Hand off the repetitive work. Set rules once and let routine tasks run in the background.",
  },
  {
    category: "ai",
    title: "Ask your backend",
    body: "An assistant that answers questions from your own project data, so finding the right number or file takes seconds.",
  },
];

export type ProductFeatureStatus = "launch" | "development";

export interface ProductFeature {
  title: string;
  body: string;
  /** For features still in development: when we expect to ship it. A plan, not a promise. */
  eta?: string;
}

/** What is in Crew Orchard on launch day (LAUNCH_LABEL). These are built and being tested in the beta. */
export const LAUNCH_FEATURES: ProductFeature[] = [
  {
    title: "Organizations and projects",
    body: "Set up an organization for your crew and a project for each thing you are building.",
  },
  {
    title: "Project canvas",
    body: "Lay out your project's sub-systems and the integrations between them on one interactive map.",
  },
  {
    title: "Documents",
    body: "A built-in word processor for specs, notes, and decisions, with autosave as you type.",
  },
  {
    title: "Spreadsheets",
    body: "Spreadsheets that live beside your documents, so the numbers stay with the project.",
  },
  {
    title: "Bills of materials",
    body: "Track parts, quantities, and costs for each sub-system, rolled up into one project BoM.",
  },
  {
    title: "Version history",
    body: "Every document and spreadsheet keeps its history, so you can see what changed and restore any version.",
  },
  {
    title: "Roles and seats",
    body: "Owners, admins, and members, with crew-wide sharing and simple per-seat pricing.",
  },
];

/** What we are building next, in the order we expect to ship it. */
export const DEVELOPMENT_FEATURES: ProductFeature[] = [
  {
    title: "Tool integrations",
    body: "Connect the tools you already use so their data flows into your projects.",
    eta: "Q2 2027",
  },
  {
    title: "Public API",
    body: "Read and write everything in Crew Orchard from your own scripts and services.",
    eta: "Q2 2027",
  },
  {
    title: "Automations",
    body: "Set rules once and let routine tasks run in the background.",
    eta: "Q3 2027",
  },
  {
    title: "Project assistant",
    body: "Ask questions in plain language and get answers from your own project data.",
    eta: "Q3 2027",
  },
  {
    title: "Enterprise controls",
    body: "Single sign-on, audit exports, and admin controls for larger teams.",
    eta: "Q4 2027",
  },
];
