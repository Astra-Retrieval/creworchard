"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/env";
import { decideProductAccess, getProductAccessMode } from "@/lib/product-access";
import type { AccessProfile } from "@/lib/product-access-rules";
import type { FormState } from "@/app/waitlist/actions";

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { status: "error", message: "Enter your email and password." };
  if (!isSupabaseConfigured()) return { status: "error", message: NOT_CONFIGURED_MESSAGE };

  const supabase = (await createClient())!;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = /confirm/i.test(error.message)
      ? "Please confirm your email first. Check your inbox for the link we sent."
      : "That email and password don't match an account.";
    return { status: "error", message: msg };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_tester, subscription_status")
    .eq("id", data.user.id)
    .maybeSingle<AccessProfile>();
  // Anyone who can enter the product lands on their organization dashboard.
  // Everyone else (members waiting for launch) goes to their account page.
  if (decideProductAccess(profile, true, await getProductAccessMode()).allowed) redirect("/app");
  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}
