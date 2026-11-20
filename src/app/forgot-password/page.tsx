import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <section className="section">
      <div className="container split" style={{ alignItems: "center" }}>
        <div>
          <p className="eyebrow">Crew access · Recovery</p>
          <h1>Forgot your password?</h1>
          <p className="lede">
            Enter the email you signed up with and we&apos;ll send you a link to choose a new one.
          </p>
          <p className="muted small">
            Remembered it? <Link href="/signin" style={{ color: "var(--mint)" }}>Back to sign in</Link>.
          </p>
        </div>
        <ForgotForm />
      </div>
    </section>
  );
}
