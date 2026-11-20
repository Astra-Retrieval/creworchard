import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe → Supabase sync. Stripe is the source of truth for billing; this
 * mirrors subscription state onto the member's profile row.
 *
 * Subscribe the endpoint to:
 *   checkout.session.completed
 *   customer.subscription.created / updated / deleted
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const db = createAdminClient();
  if (!stripe || !secret || !db) return new NextResponse("Not configured", { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    console.error("stripe webhook signature failed", err);
    return new NextResponse("Bad signature", { status: 400 });
  }

  const seatsOf = (sub: Stripe.Subscription) => sub.items.data[0]?.quantity ?? 1;
  const customerId = (c: string | Stripe.Customer | Stripe.DeletedCustomer | null) =>
    typeof c === "string" ? c : c?.id ?? null;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const userId = s.client_reference_id ?? s.metadata?.user_id;
        if (s.mode !== "subscription" || !userId || !s.subscription) break;
        const sub = await stripe.subscriptions.retrieve(
          typeof s.subscription === "string" ? s.subscription : s.subscription.id,
        );
        const { error } = await db
          .from("profiles")
          .update({
            stripe_customer_id: customerId(s.customer),
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            plan: sub.metadata?.plan ?? "early_bird",
            seats: seatsOf(sub),
          })
          .eq("id", userId);
        if (error) throw error;
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const update = { subscription_status: sub.status, seats: seatsOf(sub) };
        const userId = sub.metadata?.user_id;
        const q = db.from("profiles").update(userId ? { ...update, stripe_subscription_id: sub.id, stripe_customer_id: customerId(sub.customer) } : update);
        const { error } = userId ? await q.eq("id", userId) : await q.eq("stripe_subscription_id", sub.id);
        if (error) throw error;
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`stripe webhook ${event.type} failed`, err);
    return new NextResponse("Handler error", { status: 500 }); // Stripe will retry
  }

  return NextResponse.json({ received: true });
}
