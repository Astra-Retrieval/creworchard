import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CloseAccount } from "./CloseAccount";
import { CrewPass } from "./CrewPass";
import { firstNameOf } from "@/lib/names";
import { resumeCheckout } from "./actions";
import { signOut } from "@/app/signin/actions";
import { ContactSection } from "@/components/ContactSection";
import { Countdown } from "@/components/Countdown";
import { StackArt } from "@/components/StackArt";
import { getSession } from "@/lib/auth";
import { EARLY_BIRD, EARLY_BIRD_CLOSES_LABEL, LAUNCH_DATE_ISO, LAUNCH_LABEL, isEarlyBirdOpen } from "@/lib/site";

const LAUNCH_SHORT = "Jan 1, 2027";

/** Short status words for the crew pass. */
const PASS_STATUS: Record<string, string> = {
  past_due: "Payment issue",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  unpaid: "Unpaid",
  paused: "Paused",
};

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
  const earlyBirdOpen = isEarlyBirdOpen();

  return (
    <>
      <section className="section-tight">
        <div className="container stack">
          {checkout === "success" && (
            <div className="notice notice-success">Card saved. Your early-bird seat is locked in. Welcome aboard.</div>
          )}
          {checkout === "canceled" && (
            <div className="notice notice-info">
              Checkout was canceled. Your account exists, but your seat isn&apos;t reserved until you save a card
              {earlyBirdOpen ? <> (before {EARLY_BIRD_CLOSES_LABEL})</> : null}.
            </div>
          )}
          {checkout === "closed" && (
            <div className="notice notice-info">
              Early-bird sign-ups closed on {EARLY_BIRD_CLOSES_LABEL}, so a card can no longer be added
              at the early-bird price. Questions? Send us a message below.
            </div>
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
          <CrewPass
            name={p?.full_name ?? null}
            email={session.user.email ?? ""}
            memberNumber={p?.member_number ?? null}
            seats={seats}
            rate={`$${EARLY_BIRD.price} / seat / mo`}
            boarding={LAUNCH_SHORT}
            status={pendingWebhook ? "Confirming…" : reserved ? "Reserved" : status ? (PASS_STATUS[status] ?? status) : "Card not saved"}
            reserved={reserved}
            planLabel="Early bird"
          />

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
            {!reserved && !pendingWebhook && earlyBirdOpen && (
              <form action={resumeCheckout} style={{ marginTop: 18 }}>
                <button className="btn btn-primary btn-block">Save a card to reserve your seat</button>
                <p className="hint center" style={{ marginTop: 8 }}>Early-bird sign-ups close {EARLY_BIRD_CLOSES_LABEL}.</p>
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

      <ContactSection
        eyebrow="Contact"
        heading="Need a hand?"
        intro="Questions about your seat, billing, or Crew Orchard itself? Send a message and we'll reply to your email."
        defaultName={p?.full_name ?? ""}
        defaultEmail={session.user.email ?? ""}
        className="section-tight"
      />
    </>
  );
}
