/**
 * Single source of truth for product copy, launch timing, and pricing.
 * Edit this file to change what the site says without touching layout code.
 */

export const PRODUCT_NAME = "Crew Orchard";
export const PARENT_COMPANY = "Astra Retrieval";
export const PARENT_URL = "https://astraretrieval.com";

/** One-liner shown on the home page hero. */
export const ONE_LINER =
  "Mission operations software that lets a small crew run a fleet of deep-space spacecraft.";

/** Supporting sentence under the one-liner. */
export const SUB_LINE =
  "Built by the team behind Astra Retrieval's autonomous flight stack and private deep space network.";

/** Launch: product goes live and early-bird billing starts. 00:00 UTC. */
export const LAUNCH_DATE_ISO = "2027-01-01T00:00:00Z";
export const LAUNCH_DATE = new Date(LAUNCH_DATE_ISO);
export const LAUNCH_LABEL = "January 1, 2027";
/** Unix seconds, used for Stripe `trial_end` so nobody is charged before launch. */
export const LAUNCH_UNIX = Math.floor(LAUNCH_DATE.getTime() / 1000);

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
    blurb: "For students, researchers with a .edu address, and hobbyist missions.",
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
    blurb: "For commercial operators, primes, and government programs.",
    points: [
      "$40 per seat, per month",
      "Commercial use",
      "Priority support",
      "Deep space network add-ons as they come online",
    ],
    highlighted: false,
    cta: { label: "Available at launch", href: "/waitlist" },
    priceEnv: "STRIPE_PRICE_ENTERPRISE",
  },
];

export const EARLY_BIRD = TIERS[0];

/** Short display headline for the home hero (Michroma, caps). */
export const HEADLINE = "Run the fleet. Keep the crew small.";

export type Category = "software" | "network" | "retrieval";

export interface Feature {
  category: Category;
  title: string;
  body: string;
}

/** Feature intentions. These are plans, not promises (see the disclaimer on /features). */
export const FEATURES: Feature[] = [
  {
    category: "software",
    title: "One console for every spacecraft",
    body: "Live state, health, and upcoming events for your whole fleet on a single screen, so one operator can watch what used to take a room.",
  },
  {
    category: "software",
    title: "Autonomy handoff",
    body: "Onboard autonomy flies the routine. Crew Orchard brings the crew in at the decisions that matter and records why each call was made.",
  },
  {
    category: "software",
    title: "Anomaly triage",
    body: "Telemetry is watched continuously and odd behavior is ranked by risk, with the context an operator needs to act in minutes, not hours.",
  },
  {
    category: "network",
    title: "Deep space network passes",
    body: "Book contact windows on the Astra Retrieval private deep space network straight from your mission timeline.",
  },
  {
    category: "software",
    title: "Shared mission timelines",
    body: "Plans, procedures, and handovers live in one timeline the whole crew edits together, with roles and per-seat permissions.",
  },
  {
    category: "retrieval",
    title: "Replay and audit trail",
    body: "Every command, decision, and pass is kept, so you can replay a shift, brief a customer, or answer a reviewer with evidence.",
  },
];

export type MilestoneState = "done" | "next" | "planned";

export interface Milestone {
  when: string;
  title: string;
  body: string;
  state: MilestoneState;
}

export const MILESTONES: Milestone[] = [
  {
    when: "Nov 2026",
    title: "Waitlist and early bird open",
    body: "Reserve a seat at the lifetime early-bird price or join the waitlist for a launch code.",
    state: "done",
  },
  {
    when: "Dec 2026",
    title: "Private beta with early-bird crews",
    body: "Early-bird members get first access to the fleet console and help shape what ships.",
    state: "next",
  },
  {
    when: "Jan 1, 2027",
    title: "Crew Orchard 1.0 launches",
    body: "Fleet console, shared timelines, and anomaly triage go live. Early-bird billing begins and waitlist codes go out.",
    state: "planned",
  },
  {
    when: "Q2 2027",
    title: "Deep space network scheduling",
    body: "Book and track passes on the Astra Retrieval private deep space network from inside Crew Orchard.",
    state: "planned",
  },
  {
    when: "Q3 2027",
    title: "Autonomy handoff",
    body: "Connect onboard autonomy so routine operations run themselves and the crew handles the exceptions.",
    state: "planned",
  },
  {
    when: "Q4 2027",
    title: "Enterprise controls",
    body: "Single sign-on, audit exports, and deployment options for commercial and government programs.",
    state: "planned",
  },
];
