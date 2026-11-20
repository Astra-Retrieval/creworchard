import type { Metadata } from "next";
import { WaitlistForms } from "./WaitlistForms";
import { AsteroidBullet } from "@/components/AsteroidBullet";
import { EARLY_BIRD, EARLY_BIRD_CLOSES_LABEL, LAUNCH_LABEL, TIERS, isEarlyBirdOpen } from "@/lib/site";

export const metadata: Metadata = { title: "Join the waitlist" };

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const waitlist = TIERS.find((t) => t.id === "waitlist")!;
  const earlyBirdOpen = isEarlyBirdOpen();

  return (
    <section className="section">
      <div className="container split">
        <div className="stack">
          <div>
            <p className="eyebrow">{earlyBirdOpen ? "Pre-launch · Two ways in" : "Pre-launch · Waitlist"}</p>
            <h1>Claim your seat</h1>
            <p className="lede">
              {earlyBirdOpen ? (
                <>
                  Join the waitlist for free, or create an account today and keep the lowest price
                  for as long as you fly with us. Early-bird sign-ups close{" "}
                  <strong>{EARLY_BIRD_CLOSES_LABEL}</strong>.
                </>
              ) : (
                <>
                  Early-bird sign-ups closed on {EARLY_BIRD_CLOSES_LABEL}. Join the waitlist for
                  free and we&apos;ll email you a code at launch.
                </>
              )}
            </p>
          </div>
          <div className="side-photo">
            <ul className="bullets">
              {earlyBirdOpen && (
                <li><AsteroidBullet /> <span><strong>Early bird, ${EARLY_BIRD.price}/seat/mo for life.</strong> Card saved now, first charge {LAUNCH_LABEL}. Closes {EARLY_BIRD_CLOSES_LABEL}.</span></li>
              )}
              <li><AsteroidBullet /> <span><strong>Waitlist, ${waitlist.price}/seat/mo.</strong> No card. Registration code emailed at launch.</span></li>
              {earlyBirdOpen && (
                <li><AsteroidBullet /> <span>Close your early-bird account any time before launch and pay nothing.</span></li>
              )}
            </ul>
          </div>
        </div>
        <WaitlistForms
          initialMode={plan === "early_bird" ? "early_bird" : "waitlist"}
          earlyBirdOpen={earlyBirdOpen}
        />
      </div>
    </section>
  );
}
