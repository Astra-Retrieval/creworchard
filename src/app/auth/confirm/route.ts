import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "invite", "magiclink", "email_change"];

/**
 * Handles links in Supabase emails (sign-up confirmation and password reset).
 *
 * The email templates send a one-time `token_hash` instead of a PKCE code, so
 * the link works in any browser or device, not only the one that requested it.
 * verifyOtp checks the token on the server and sets the session cookie.
 *
 *   Confirm signup:  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account
 *   Reset password:  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? (type === "recovery" ? "/reset-password" : "/account");
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/account";

  // Build redirects from a clean URL so the one-time token never lingers in history.
  const target = request.nextUrl.clone();
  target.search = "";

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const result = await supabase?.auth.verifyOtp({ type, token_hash: tokenHash });
    if (result && !result.error) {
      target.pathname = next;
      return NextResponse.redirect(target);
    }
    console.error("auth confirm failed", result ? (result.error?.code ?? result.error?.message) : "supabase not configured");
  }

  target.pathname = "/signin";
  target.searchParams.set("notice", type === "recovery" ? "reset" : "auth");
  return NextResponse.redirect(target);
}
