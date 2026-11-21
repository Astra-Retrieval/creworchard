import type { Metadata } from "next";
import Link from "next/link";
import { AsteroidBullet } from "@/components/AsteroidBullet";
import { FeatureMotion } from "@/components/FeatureMotion";
import { StackArt } from "@/components/StackArt";
import { DEVELOPMENT_FEATURES, FEATURES, LAUNCH_FEATURES, LAUNCH_LABEL, type Category } from "@/lib/site";

export const metadata: Metadata = { title: "Features" };

const CATEGORY_PILL: Record<Category, { cls: string; label: string }> = {
  core: { cls: "pill-mint", label: "Core" },
  integrations: { cls: "pill-blue", label: "Integrations" },
  team: { cls: "pill-violet", label: "Crew" },
  ai: { cls: "pill-violet", label: "Assistant" },
};

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

      <section className="section-tight" aria-label="How Crew Orchard works">
        <div className="container">
          <FeatureMotion />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="eyebrow">02 · Features</p>
          <h2>What ships, and what is next</h2>
          <p className="lede">
            The features live on launch day, {LAUNCH_LABEL}, and the ones we are building after that.
          </p>
          <div className="grid grid-2 feature-groups">
            <section className="card" aria-labelledby="launch-features">
              <div className="feature-group-head">
                <h3 id="launch-features">Launch features</h3>
                <span className="pill pill-mint">Live at launch</span>
              </div>
              <ul className="feature-list">
                {LAUNCH_FEATURES.map((f) => (
                  <li className="feature-item" key={f.title}>
                    <span className="feature-item-mark is-live" aria-hidden />
                    <h4>{f.title}</h4>
                    <span />
                    <p>{f.body}</p>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card" aria-labelledby="development-features">
              <div className="feature-group-head">
                <h3 id="development-features">In development</h3>
                <span className="pill pill-blue">Coming after launch</span>
              </div>
              <ul className="feature-list">
                {DEVELOPMENT_FEATURES.map((f) => (
                  <li className="feature-item" key={f.title}>
                    <span className="feature-item-mark is-dev" aria-hidden />
                    <h4>{f.title}</h4>
                    <span className="feature-item-eta">{f.eta ? <><span className="sr-only">Expected </span>{f.eta}</> : null}</span>
                    <p>{f.body}</p>
                  </li>
                ))}
              </ul>
            </section>
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
