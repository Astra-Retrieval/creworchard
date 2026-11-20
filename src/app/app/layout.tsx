import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { decideProductAccess, getProductAccessMode, isProductOpen } from "@/lib/product-access";
import { LAUNCH_LABEL } from "@/lib/site";

export const metadata: Metadata = { title: "App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The door to the product. Every page under /app goes through this check
 * first (see src/lib/product-access.ts for the rule).
 */
export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const mode = await getProductAccessMode();
  const access = decideProductAccess(session?.profile, Boolean(session), mode);

  if (!access.allowed) {
    if (access.next === "not_found") notFound();
    if (access.next === "sign_in") redirect("/signin?notice=app");
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <p className="eyebrow">Crew Orchard · Access</p>
          <h1>Your seat isn&apos;t active</h1>
          <p className="lede">
            Crew Orchard is open to members with an active subscription. Check your billing status on
            your account page, or send us a message and we&apos;ll sort it out.
          </p>
          <div className="row">
            <Link href="/account" className="btn btn-primary">Go to my account</Link>
            <Link href="/account#contact" className="btn btn-ghost">Contact us</Link>
          </div>
        </div>
      </section>
    );
  }

  const open = isProductOpen(mode);
  return (
    <>
      {!open && (
        <div className="container" style={{ paddingTop: 16 }}>
          <div className="notice notice-info" role="status">
            <strong>Private preview.</strong> Only{" "}
            {access.reason === "tester" ? "testers and admins" : "admins and testers"} can see this. It opens to
            members with an active subscription on {LAUNCH_LABEL}
            {mode === "closed" ? " once you switch product access back on in Admin" : ""}.
          </div>
        </div>
      )}
      {children}
    </>
  );
}
