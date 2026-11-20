#!/usr/bin/env node
/**
 * Creates the Crew Orchard product and its four per-seat monthly prices in
 * whichever Stripe account STRIPE_SECRET_KEY points at (use a test key first).
 * Prints the env lines to paste into .env.local. Safe to re-run: it reuses
 * prices it finds by lookup_key.
 *
 *   STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first.");
  process.exit(1);
}
const stripe = new Stripe(key);

const tiers = [
  { env: "STRIPE_PRICE_EARLY_BIRD", lookup: "crew_orchard_early_bird", nickname: "Early Bird (lifetime)", amount: 1000 },
  { env: "STRIPE_PRICE_WAITLIST", lookup: "crew_orchard_waitlist", nickname: "Waitlist", amount: 1500 },
  { env: "STRIPE_PRICE_ACADEMIC", lookup: "crew_orchard_academic", nickname: "Academic & Hobby", amount: 2500 },
  { env: "STRIPE_PRICE_ENTERPRISE", lookup: "crew_orchard_enterprise", nickname: "Enterprise", amount: 4000 },
];

const existing = await stripe.prices.list({ lookup_keys: tiers.map((t) => t.lookup), limit: 10 });
let productId = existing.data[0]?.product;
if (typeof productId !== "string") {
  const product = await stripe.products.create({
    name: "Crew Orchard",
    description: "Crew Orchard seat, billed monthly. A product of Astra Retrieval.",
    unit_label: "seat",
  });
  productId = product.id;
}

const lines = [];
for (const t of tiers) {
  let price = existing.data.find((p) => p.lookup_key === t.lookup);
  if (!price) {
    price = await stripe.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: t.amount,
      recurring: { interval: "month" },
      nickname: t.nickname,
      lookup_key: t.lookup,
    });
  }
  lines.push(`${t.env}=${price.id}`);
}
console.log("\nAdd these to .env.local:\n");
console.log(lines.join("\n"));
