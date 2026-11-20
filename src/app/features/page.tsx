import type { Metadata } from "next";
import Link from "next/link";
import { AsteroidBullet } from "@/components/AsteroidBullet";
import { StackArt } from "@/components/StackArt";
import { FEATURES, MILESTONES, type Category } from "@/lib/site";

export const metadata: Metadata = { title: "Features" };

const CATEGORY_PILL: Record<Category, { cls: string; label: string }> = {
  core: { cls: "pill-mint", label: "Core" },
  integrations: { cls: "pill-blue", label: "Integrations" },
  team: { cls: "pill-violet", label: "Crew" },
  ai: { cls: "pill-violet", label: "Assistant" },
};

const STATE_PILL = {
  done: { cls: "pill-mint", label: "Live" },
  next: { cls: "pill-blue", label: "Next" },
  planned: { cls: "pill-gold", label: "Planned" },
} as const;

export default function FeaturesPage() {
  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container split" style={{ alignItems: "center" }}>
          <div>
            <p className="eyebrow">01 · Feature intentions</p>
            <h1>What we are building</h1>
            <p className="lede">
              Crew Orchard is the <strong>backend for engineers</strong>: the systems behind your
              work, kept running underneath, so your crew can stay focused on what you are building.
            </p>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <StackArt />
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container grid grid-3">
          {FEATURES.map((f, i) => (
            <article className="card" key={f.title}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
                <span className="eyebrow" style={{ margin: 0 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`pill ${CATEGORY_PILL[f.category].cls}`}>{CATEGORY_PILL[f.category].label}</span>
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="eyebrow">02 · Milestones</p>
          <h2>Roadmap</h2>
          <p className="lede">Where we are, and where we are headed next.</p>
          <div className="card timeline" style={{ marginTop: 32 }}>
            {MILESTONES.map((m) => (
              <div className="milestone" key={m.title}>
                <div className="milestone-when">{m.when}</div>
                <div className="milestone-track">
                  <span className={`milestone-dot ${m.state === "done" ? "is-done" : m.state === "next" ? "is-next" : ""}`} />
                </div>
                <div className="milestone-body">
                  <h3>
                    {m.title} <span className={`pill ${STATE_PILL[m.state].cls}`}>{STATE_PILL[m.state].label}</span>
                  </h3>
                  <p>{m.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-2" style={{ marginTop: 48, alignItems: "center" }}>
            <ul className="bullets">
              <li><AsteroidBullet /> Reserve a seat now and help shape the beta.</li>
              <li><AsteroidBullet /> Early-bird pricing is locked for life.</li>
              <li><AsteroidBullet /> Nothing is charged before launch.</li>
            </ul>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <Link href="/waitlist" className="btn btn-primary">Join the waitlist</Link>
              <Link href="/pricing" className="btn btn-ghost">See pricing</Link>
            </div>
          </div>

          <p className="disclaimer" style={{ marginTop: 56 }}>
            <strong>This is not a guarantee</strong>
            The features and dates on this page are our current plan, not a promise. Scope, order,
            and timing may change as we build, test, and learn from early users.
          </p>
        </div>
      </section>
    </>
  );
}
