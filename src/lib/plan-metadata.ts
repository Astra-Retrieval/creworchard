import "server-only";
import { billingStartsAtLaunch } from "@/lib/checkout";
import { LAUNCH_LABEL, type Tier } from "@/lib/site";

/**
 * Plan details saved on the Supabase user at sign-up, so auth emails can show
 * them through {{ .Data.* }} instead of hard-coding prices in the templates.
 * Values are pre-formatted strings because email templates can't do math.
 *
 * Display only: billing always comes from Stripe, never from these fields.
 */
export interface PlanMetadata {
  plan_id: string;
  plan_name: string;
  /** e.g. "$10" */
  price_per_seat: string;
  /** e.g. "$20" */
  monthly_total: string;
  /** Set only while new subscriptions are billed starting at launch. */
  first_charge_date?: string;
}

function usd(amount: number): string {
  return "$" + amount.toLocaleString("en-US");
}

export function planMetadata(tier: Tier, seats: number, now = Date.now()): PlanMetadata {
  return {
    plan_id: tier.id,
    plan_name: tier.name,
    price_per_seat: usd(tier.price),
    monthly_total: usd(tier.price * seats),
    ...(billingStartsAtLaunch(now) ? { first_charge_date: LAUNCH_LABEL } : {}),
  };
}
