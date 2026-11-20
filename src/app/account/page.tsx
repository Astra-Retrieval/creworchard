import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CloseAccount } from "./CloseAccount";
import { EditName } from "./EditName";
import { firstNameOf } from "@/lib/names";
import { resumeCheckout } from "./actions";
import { signOut } from "@/app/signin/actions";
import { Countdown } from "@/components/Countdown";
import { StackArt } from "@/components/StackArt";
import { LogoMark } from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { EARLY_BIRD, LAUNCH_DATE_ISO, LAUNCH_LABEL } from "@/lib/site";

export const metadata: Metadata = { title: "Your seat" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  trialing: "Reserved · billing starts at launch",
  active: "Active",
  past_due: "Payment issue",
  canceled: "Canceled",
  incomplete: "Incomplete",
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/signin?notice=confirm");
  const { checkout } = await searchParams;
  const p = session.profile;

  const firstName = firstNameOf(p?.full_name);
  const seats = p?.seats ?? 1;
  const status = p?.subscription_status;
  const reserved = status === "trialing" || status === "active";
  // The webhook can land a second or two after Stripe redirects back.
  const pendingWebhook = checkout === "success" && !reserved;
  const memberNo = p?.member_number ? String(p.member_number).padStart(4, "0") : "----";

  return (
    <>
      <section className="section-tight">
        <div className="container stack">
          {checkout === "success" && (
            <div className="notice notice-success">Card saved. Your early-bird seat is locked in. Welcome aboard.</div>
          )}
          {checkout === "canceled" && (
            <div className="notice notice-info">Checkout was canceled. Your account exists, but your seat isn&apos;t reserved until you save a card.</div>
          )}

          <div>
            <p className="eyebrow">Status · Pre-launch · All systems nominal</p>
            <h1>{firstName ? `Welcome aboard, ${firstName}` : "Welcome aboard"}</h1>
            <p className="lede">
              Crew Orchard launches on <strong>{LAUNCH_LABEL}</strong>. Your early-bird price is
              locked in. We&apos;ll email you the moment it opens.
            </p>
          </div>

          <div className="card">
            <p className="eyebrow">T-minus to launch</p>
            <Countdown targetIso={LAUNCH_DATE_ISO} />
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container grid grid-2">
          <div className="card boarding">
            <div className="stack-sm">
              <p className="eyebrow" style={{ margin: 0 }}>Early-bird crew pass</p>
              <EditName name={p?.full_name ?? null} email={session.user.email ?? ""} />
              {p?.organization && <div className="muted small">{p.organization}</div>}
              <div className="row" style={{ marginTop: 14 }}>
                <span className="pill pill-mint">{seats} {seats === 1 ? "seat" : "seats"}</span>
                <span className="pill pill-gold">Launch {LAUNCH_LABEL}</span>
              </div>
            </div>
            <div className="boarding-stub">
              <LogoMark size={44} />
              <div className="stat-label" style={{ marginTop: 10 }}>Member no.</div>
              <div className="member-no">{memberNo}</div>
            </div>
          </div>

          <div className="card">
            <p className="eyebrow">Telemetry</p>
            <div className="telemetry">
              <div className="telemetry-row"><span>PLAN</span><span>{EARLY_BIRD.name.toUpperCase()} · LIFETIME</span></div>
              <div className="telemetry-row"><span>RATE</span><span>${EARLY_BIRD.price} / SEAT / MO</span></div>
              <div className="telemetry-row"><span>SEATS</span><span>{seats}</span></div>
              <div className="telemetry-row"><span>AT LAUNCH</span><span>${seats * EARLY_BIRD.price} / MO</span></div>
              <div className="telemetry-row"><span>FIRST CHARGE</span><span>{LAUNCH_LABEL.toUpperCase()}</span></div>
              <div className="telemetry-row">
                <span>STATUS</span>
                <span className={reserved ? "ok" : undefined}>
                  {pendingWebhook ? "CONFIRMING…" : (status ? STATUS_LABEL[status] ?? status : "Card not saved").toUpperCase()}
                </span>
              </div>
            </div>
            {!reserved && !pendingWebhook && (
              <form action={resumeCheckout} style={{ marginTop: 18 }}>
                <button className="btn btn-primary btn-block">Save a card to reserve your seat</button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container grid grid-2" style={{ alignItems: "center" }}>
          <div className="card" style={{ padding: 12 }}>
            <StackArt label="Your seat" />
          </div>
          <div className="stack">
            <p className="eyebrow" style={{ margin: 0 }}>Launch checklist</p>
            <ul className="telemetry" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li className="telemetry-row"><span>ACCOUNT CREATED</span><span className="ok">GO</span></li>
              <li className="telemetry-row"><span>EARLY-BIRD PRICE LOCKED</span><span className={reserved ? "ok" : undefined}>{reserved ? "GO" : "HOLD"}</span></li>
              <li className="telemetry-row"><span>PRIVATE BETA INVITE</span><span>DEC 2026</span></li>
              <li className="telemetry-row"><span>CREW ORCHARD OPENS</span><span>{LAUNCH_LABEL.toUpperCase()}</span></li>
            </ul>
            <div className="row" style={{ marginTop: 8 }}>
              <form action={signOut}>
                <button className="btn btn-ghost">Sign out</button>
              </form>
            </div>
            <CloseAccount />
          </div>
        </div>
      </section>
    </>
  );
}
