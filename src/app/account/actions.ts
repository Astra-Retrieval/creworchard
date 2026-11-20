"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { cleanName } from "@/lib/names";
import { createEarlyBirdCheckout } from "@/lib/checkout";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/app/waitlist/actions";

/**
 * Lets a signed-in member change the name we greet them by. The name lives in
 * two places, and both are updated:
 *  - the auth user's metadata (full_name), which emails read as {{ .Data.full_name }}
 *  - the profiles row, which the account and admin pages read
 * Members can't write to profiles directly (no RLS update policy), so that
 * write goes through the service-role client after the session is checked.
 */
export async function updateName(_prev: FormState, fd: FormData): Promise<FormState> {
  const fullName = cleanName(fd.get("full_name"));
  if (!fullName) return { status: "error", message: "Please enter your name." };

  const session = await getSession();
  if (!session) return { status: "error", message: "Your session expired. Please sign in again." };

  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return { status: "error", message: "Account changes are not available right now." };

  const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
  if (metaError) {
    console.error("name metadata update failed", metaError);
    return { status: "error", message: "We couldn't save your name. Please try again." };
  }
  const { error: profileError } = await admin.from("profiles").update({ full_name: fullName }).eq("id", session.user.id);
  if (profileError) {
    console.error("name profile update failed", profileError);
    return { status: "error", message: "We couldn't save your name. Please try again." };
  }

  revalidatePath("/account");
  return { status: "success", message: fullName };
}

/** For members whose account exists but who left Stripe Checkout before saving a card. */
export async function resumeCheckout() {
  const session = await getSession();
  if (!session?.user.email) redirect("/signin");
  const url = await createEarlyBirdCheckout({
    userId: session.user.id,
    email: session.user.email,
    seats: session.profile?.seats ?? 1,
  });
  redirect(url);
}

/**
 * Closes the account: cancels the Stripe subscription immediately (so the
 * launch-day charge never happens), deletes the auth user (the profile row
 * cascades), and signs the browser out.
 */
export async function closeAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  if (String(fd.get("confirm") ?? "").trim().toUpperCase() !== "CLOSE") {
    return { status: "error", message: 'Type CLOSE to confirm.' };
  }
  const session = await getSession();
  if (!session) redirect("/signin");

  const admin = createAdminClient();
  if (!admin) return { status: "error", message: "Account changes are not available yet. Please try again later." };

  const subId = session.profile?.stripe_subscription_id;
  if (subId) {
    const stripe = getStripe();
    if (!stripe) return { status: "error", message: "Billing is unavailable right now, so we can't cancel safely. Please try again later." };
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      if (sub.status !== "canceled") await stripe.subscriptions.cancel(subId);
    } catch (e) {
      console.error("subscription cancel failed", e);
      return { status: "error", message: "We couldn't cancel your subscription. Nothing was deleted; please try again." };
    }
  }

  const { error } = await admin.auth.admin.deleteUser(session.user.id);
  if (error) {
    console.error("user delete failed", error);
    return { status: "error", message: "Your subscription was canceled but we couldn't remove your account. Please contact us." };
  }

  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/signin?notice=closed");
}
