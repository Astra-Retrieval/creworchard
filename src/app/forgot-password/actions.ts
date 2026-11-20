"use server";

import { createClient } from "@/lib/supabase/server";
import { env, isSupabaseConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/env";
import type { FormState } from "@/app/waitlist/actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Emails a password-reset link. The link lands on /auth/callback, which signs
 * the user in and forwards them to /reset-password to choose a new password.
 * The reply is the same whether or not the address has an account, so the
 * form can't be used to discover who has signed up.
 */
export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Please enter a valid email address." };
  if (!isSupabaseConfigured()) return { status: "error", message: NOT_CONFIGURED_MESSAGE };

  const supabase = (await createClient())!;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return { status: "error", message: "Too many emails were sent recently. Please wait a few minutes and try again." };
    }
    if (error.code !== "user_not_found") {
      console.error("password reset email failed", error);
      return { status: "error", message: "We couldn't send the email right now. Please try again shortly." };
    }
  }

  return { status: "success", message: `If ${email} has an account, a reset link is on its way. Check your inbox.` };
}
