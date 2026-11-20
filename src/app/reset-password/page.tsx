import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./ResetForm";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const user = await getUser();

  return (
    <section className="section">
      <div className="container split" style={{ alignItems: "center" }}>
        <div>
          <p className="eyebrow">Crew access · Recovery</p>
          <h1>Choose a new password</h1>
          {user ? (
            <p className="lede">
              Signed in as <strong>{user.email}</strong>. Pick a new password with at least 8 characters.
            </p>
          ) : (
            <p className="lede">
              This page only works from the link in your reset email, and that link has expired or
              was already used.
            </p>
          )}
        </div>
        {user ? (
          <ResetForm />
        ) : (
          <div className="card stack">
            <p style={{ margin: 0 }}>Request a fresh link and open it on this device.</p>
            <Link href="/forgot-password" className="btn btn-primary btn-block">Send a new reset link</Link>
          </div>
        )}
      </div>
    </section>
  );
}
