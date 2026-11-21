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

export interface ProductFeature {
  title: string;
  body: string;
}

export interface FeatureGroup {
  title: string;
  features: ProductFeature[];
}

/**
 * What is in Crew Orchard on launch day (LAUNCH_LABEL), grouped by area.
 * Where a feature also has a bigger version planned, the basic version is
 * here and the bigger one is in DEVELOPMENT_FEATURE_GROUPS.
 */
export const LAUNCH_FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "Projects and teams",
    features: [
      { title: "Multiple projects", body: "Run several projects in one organization, each with its own roles and people." },
      { title: "Project hierarchy", body: "Break a project into sub-systems and sub-sub-systems, each with its own space." },
      { title: "Project canvas", body: "Map your sub-systems and the integrations between them on one interactive canvas." },
      { title: "Integration stages", body: "Add stages to each integration to track how sub-systems come together." },
      { title: "Roles on every sub-system", body: "Assign people to each sub-system and integration with their role, and add people to existing ones at any time." },
      { title: "Organization roles and seats", body: "Owners, admins, and members, with simple per-seat pricing." },
      { title: "Team meeting scheduling", body: "Schedule meetings between the teams working on each sub-system and integration." },
    ],
  },
  {
    title: "Documents and files",
    features: [
      { title: "Project drive", body: "One drive for everything in the project, plus a dedicated space for each sub-system and sub-assembly." },
      { title: "Document hub", body: "A single, organized home for project documents, with dedicated spaces for big ones like electrical and the BoM." },
      { title: "File management", body: "Upload Word documents, images, and other files, and keep them organized in folders." },
      { title: "Built-in word processor", body: "Write specs, notes, and decisions with autosave and images placed right in the document." },
      { title: "Built-in spreadsheets", body: "Spreadsheets with autosave that live beside your documents." },
      { title: "Document tracking", body: "Follow every document across the project, with a timeline of each change and any version one click from restore." },
      { title: "Linked documents", body: "Changes to a sub-system's documents flow through to the overall project documents." },
      { title: "Export and delete", body: "Export documents to share outside Crew Orchard, and delete the ones you no longer need." },
      { title: "Templates", body: "Save templates and apply a set template to a whole project or a single sub-system." },
    ],
  },
  {
    title: "BoM and budget",
    features: [
      { title: "Bills of materials", body: "Every part with its supplier, part number, link, quantity, cost, and the other details you need." },
      { title: "Sub-assembly to project BoM", body: "Each sub-assembly's BoM rolls up into the project BoM, and the same for electrical." },
      { title: "Budgeting", body: "Set budgets for the project and its sub-systems." },
    ],
  },
  {
    title: "Requirements and to-dos",
    features: [
      { title: "Requirements", body: "Requirements documents for the whole project and for each sub-assembly." },
      { title: "Constraints", body: "A constraints document for the project and each sub-system." },
      { title: "Requirement-linked to-dos", body: "Break requirements into to-dos, tie each one to its requirement, and tick it off when it is done." },
      { title: "Project and team to-do lists", body: "One overall to-do list, plus a list for each sub-system and integration." },
      { title: "Assignees", body: "Assign people to every to-do item." },
      { title: "Board views", body: "See to-dos as a list or on a board." },
      { title: "Progress tracker", body: "A running tracker of what is done and what is left." },
    ],
  },
  {
    title: "Your say in what is next",
    features: [
      { title: "Feature requests", body: "Send a feature request straight from your user settings." },
      { title: "In-app roadmap", body: "See the features we are building without leaving the app." },
    ],
  },
];

/** What we are building after launch, grouped by area. No dates: these are plans, not promises. */
export const DEVELOPMENT_FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "Connected tools",
    features: [
      { title: "Calendar plugins", body: "Connect your calendars to schedule meetings between people and teams." },
      { title: "Availability", body: "See when people are busy before you book a meeting." },
      { title: "Slack and email plugins", body: "Pull in more project data from Slack and email." },
      { title: "CAD integration", body: "Changes made in CAD show everything they affect across the project, from integrations and requirements to the BoM." },
    ],
  },
  {
    title: "Engineering workflow",
    features: [
      { title: "Deeper hierarchies", body: "Nest sub-systems as many levels deep as your design needs." },
      { title: "Design reviews and sign-offs", body: "Run design reviews and collect sign-offs inside the project." },
      { title: "Change impact tracking", body: "See how each change affects requirements and to-dos." },
      { title: "Constraint conflicts", body: "Get flagged when a change conflicts with a constraint." },
      { title: "Software development tracking", body: "Track software work alongside the hardware." },
    ],
  },
  {
    title: "Planning and cost",
    features: [
      { title: "Gantt charts", body: "A Gantt chart for each sub-system and for the overall project." },
      { title: "Development cost tracker", body: "Track what development is costing as you go." },
      { title: "Cost savings", body: "Find where cost savings can be made across the project." },
      { title: "Native parts purchasing", body: "Buy parts straight from your BoM." },
    ],
  },
  {
    title: "Management and experience",
    features: [
      { title: "Management tools", body: "Tools for leads and managers to run their teams and projects." },
      { title: "Personal views", body: "Different views of to-dos, including one for just your own assignments." },
      { title: "Delete anything", body: "Delete sub-systems, integrations, to-dos, and any other item, not just documents." },
      { title: "Profile pictures", body: "Profile pictures and icons for everyone on your crew." },
      { title: "Experience upgrades", body: "Improvements to the app, shaped by your feedback." },
    ],
  },
];
