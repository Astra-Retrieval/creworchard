"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/app/waitlist/actions";

/** Sets a new password for the user signed in by the reset link. */
export async function updatePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 8) return { status: "error", message: "Use a password of at least 8 characters." };
  if (password !== confirm) return { status: "error", message: "The two passwords don't match." };

  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Sign-in isn't available right now." };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: "Your reset link has expired. Please request a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const msg = /weak|pwned|leaked/i.test(error.message)
      ? "That password has appeared in a known data breach or is too weak. Please choose another."
      : /different/i.test(error.message)
        ? "Please choose a password different from your old one."
        : "We couldn't update your password. Please try again.";
    return { status: "error", message: msg };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  redirect(profile?.role === "admin" ? "/admin" : "/account");
}
