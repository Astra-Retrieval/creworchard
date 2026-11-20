import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "./SignInForm";
import { getSession } from "@/lib/auth";
import { EARLY_BIRD } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  confirm: "Check your inbox to confirm your email, then sign in to see your seat.",
  closed: "Your account has been closed. Safe travels.",
  auth: "That link was invalid or expired. Please sign in again, or request a new reset link.",
  reset: "That reset link was invalid or already used. Request a new one with \"Forgot password?\" and use the newest email.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (await getSession()) redirect("/account");
  const { notice } = await searchParams;

  return (
    <section className="section">
      <div className="container split" style={{ alignItems: "center" }}>
        <div>
          <p className="eyebrow">Crew access</p>
          <h1>Sign in</h1>
          <p className="lede">
            For early-bird members who reserved a seat at ${EARLY_BIRD.price} per seat. On the
            waitlist? You&apos;ll get a registration code by email at launch.
          </p>
          <p className="muted small">
            No account yet? <Link href="/waitlist?plan=early_bird" style={{ color: "var(--mint)" }}>Claim the early-bird price</Link>.
          </p>
        </div>
        <div className="stack">
          {notice && NOTICES[notice] && <div className="notice notice-info">{NOTICES[notice]}</div>}
          <SignInForm />
        </div>
      </div>
    </section>
  );
}
