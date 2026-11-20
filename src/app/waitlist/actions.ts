"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createEarlyBirdCheckout } from "@/lib/checkout";
import { planMetadata } from "@/lib/plan-metadata";
import { EARLY_BIRD } from "@/lib/site";
import { env, isStripeConfigured, isSupabaseAdminConfigured, isSupabaseConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/env";

export interface FormState {
  status: "idle" | "success" | "error";
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USE_CASES = ["commercial", "academic", "hobby", "government", "other"] as const;

function str(fd: FormData, key: string, max = 200) {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

function seatsFrom(fd: FormData) {
  const n = Number.parseInt(String(fd.get("seats") ?? "1"), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 500) : 1;
}

/** Free waitlist sign-up. No account is created; a launch code is emailed later. */
export async function joinWaitlist(_prev: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, "company_website")) return { status: "success", message: "You're on the list." }; // honeypot

  const full_name = str(fd, "full_name", 120);
  const email = str(fd, "email", 254).toLowerCase();
  const organization = str(fd, "organization", 160) || null;
  const use_case = str(fd, "use_case", 20);
  const notes = str(fd, "notes", 1000) || null;
  const seats = seatsFrom(fd);

  if (!full_name) return { status: "error", message: "Please tell us your name." };
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Please enter a valid email address." };
  if (!USE_CASES.includes(use_case as (typeof USE_CASES)[number]))
    return { status: "error", message: "Please choose how you plan to use Crew Orchard." };

  if (!isSupabaseAdminConfigured()) return { status: "error", message: NOT_CONFIGURED_MESSAGE };
  const db = createAdminClient()!;

  const { error } = await db.from("waitlist").insert({ full_name, email, organization, use_case, seats, notes });
  if (error) {
    if (error.code === "23505") {
      return { status: "success", message: "You're already on the list. We'll email your code at launch." };
    }
    console.error("waitlist insert failed", error);
    return { status: "error", message: "Something went wrong saving your spot. Please try again." };
  }

  return {
    status: "success",
    message: `You're on the list, ${full_name.split(" ")[0]}. Watch ${email} for your launch code.`,
  };
}

/**
 * Early-bird account: creates a Supabase user, then sends them to Stripe
 * Checkout to save a card. Nothing is charged until launch day.
 */
export async function createEarlyBirdAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  const full_name = str(fd, "full_name", 120);
  const email = str(fd, "email", 254).toLowerCase();
  const password = String(fd.get("password") ?? "");
  const organization = str(fd, "organization", 160) || null;
  const seats = seatsFrom(fd);
  const agreed = fd.get("agree") === "on";

  if (!full_name) return { status: "error", message: "Please tell us your name." };
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Please enter a valid email address." };
  if (password.length < 8) return { status: "error", message: "Use a password of at least 8 characters." };
  if (!agreed) return { status: "error", message: "Please confirm you understand when billing starts." };

  if (!isSupabaseConfigured() || !isStripeConfigured()) return { status: "error", message: NOT_CONFIGURED_MESSAGE };

  const supabase = (await createClient())!;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Plan fields feed the confirmation email ({{ .Data.plan_name }} and friends).
      data: { full_name, organization, seats, ...planMetadata(EARLY_BIRD, seats) },
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=/account`,
    },
  });

  if (error) return { status: "error", message: error.message };
  // Supabase returns a user with no identities when the email is already registered.
  if (!data.user || data.user.identities?.length === 0) {
    return { status: "error", message: "An account with that email already exists. Please sign in instead." };
  }

  let url: string;
  try {
    url = await createEarlyBirdCheckout({ userId: data.user.id, email, seats });
  } catch (e) {
    console.error("checkout create failed", e);
    return {
      status: "error",
      message: "Your account was created, but we couldn't reach checkout. Sign in to finish reserving your seat.",
    };
  }
  redirect(url);
}
