import type { Metadata } from "next";
import Link from "next/link";
import { AsteroidBullet } from "@/components/AsteroidBullet";
import { LAUNCH_LABEL, TIERS } from "@/lib/site";

export const metadata: Metadata = { title: "Pricing" };

const FAQ = [
  {
    q: "When will I be charged?",
    a: `Early-bird members save a card today and are first charged on ${LAUNCH_LABEL}, when the product goes live. Cancel before then and you pay nothing.`,
  },
  {
    q: "What is a seat?",
    a: "A seat is one named person on your crew. Every tier is priced per seat, per month, so you only pay for the people who log in.",
  },
  {
    q: "How does waitlist pricing work?",
    a: "Join the waitlist for free. At launch we email you a registration code that unlocks $15 per seat, per month.",
  },
  {
    q: "Who qualifies for Academic & Hobby?",
    a: "Anyone signing up with a .edu email address, or anyone who agrees their use is personal and non-commercial.",
  },
];

export default function PricingPage() {
  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Pricing · Per seat, per month</p>
        <h1>Lock in a seat early</h1>
        <p className="lede">
          Four simple tiers, all billed <strong>per seat</strong>. The two highlighted options are
          only available before launch on {LAUNCH_LABEL}.
        </p>

        <div className="grid grid-4" style={{ marginTop: 40, alignItems: "stretch" }}>
          {TIERS.map((t) => (
            <article key={t.id} className={`card tier ${t.highlighted ? "tier-highlight" : "tier-dim"}`}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>{t.name}</h3>
                <span className={`pill ${t.highlighted ? "pill-mint" : "pill-dust"}`}>{t.tag}</span>
              </div>
              <div className="tier-price">
                <span className="amount">${t.price}</span>
                <span className="unit">/ seat / mo</span>
              </div>
              <p className="muted small" style={{ margin: 0 }}>{t.blurb}</p>
              <ul>
                {t.points.map((p) => (
                  <li key={p}>
                    <AsteroidBullet color={t.highlighted ? "var(--mint)" : "var(--dust)"} />
                    {p}
                  </li>
                ))}
              </ul>
              {t.highlighted ? (
                <Link href={t.cta.href} className={`btn btn-block ${t.id === "early_bird" ? "btn-primary" : "btn-ghost"}`}>
                  {t.cta.label}
                </Link>
              ) : (
                <span className="btn btn-ghost btn-block" aria-disabled style={{ opacity: 0.6, cursor: "default" }}>
                  {t.cta.label}
                </span>
              )}
            </article>
          ))}
        </div>

        <hr className="divider" style={{ margin: "72px 0 48px" }} />

        <p className="eyebrow">Questions</p>
        <div className="grid faq-grid">
          {FAQ.map((f) => (
            <div key={f.q} className="card">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
