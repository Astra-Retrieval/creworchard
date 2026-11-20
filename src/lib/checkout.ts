import "server-only";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { EARLY_BIRD, LAUNCH_UNIX } from "@/lib/site";

/** Stripe requires trial_end to be at least 48 hours out; keep a safety margin. */
const MIN_TRIAL_SECONDS = 49 * 60 * 60;

/**
 * Creates a Stripe Checkout session for the early-bird subscription.
 * The card is collected now; the subscription sits in a free trial that ends
 * at launch, which is when the first invoice is created and charged.
 * Returns the hosted Checkout URL.
 */
export async function createEarlyBirdCheckout(opts: {
  userId: string;
  email: string;
  seats: number;
}): Promise<string> {
  const stripe = getStripe();
  const price = process.env.STRIPE_PRICE_EARLY_BIRD;
  if (!stripe || !price) throw new Error("Stripe is not configured");

  const nowUnix = Math.floor(Date.now() / 1000);
  const deferBilling = LAUNCH_UNIX - nowUnix > MIN_TRIAL_SECONDS;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: opts.email,
    client_reference_id: opts.userId,
    line_items: [{ price, quantity: opts.seats }],
    payment_method_collection: "always",
    allow_promotion_codes: false,
    metadata: { user_id: opts.userId, plan: EARLY_BIRD.id },
    subscription_data: {
      metadata: { user_id: opts.userId, plan: EARLY_BIRD.id },
      description: "Crew Orchard early bird: billing starts at launch",
      ...(deferBilling
        ? {
            trial_end: LAUNCH_UNIX,
            trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
          }
        : {}),
    },
    success_url: `${env.siteUrl}/account?checkout=success`,
    cancel_url: `${env.siteUrl}/account?checkout=canceled`,
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return session.url;
}
