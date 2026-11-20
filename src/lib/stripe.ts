import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Lazily constructed Stripe client; null until STRIPE_SECRET_KEY is set. */
export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      appInfo: { name: "Crew Orchard Web" },
    });
  }
  return client;
}
