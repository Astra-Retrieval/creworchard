import type { Metadata } from "next";
import Link from "next/link";
import { AsteroidBullet } from "@/components/AsteroidBullet";
import { FeatureMotion } from "@/components/FeatureMotion";
import { StackArt } from "@/components/StackArt";
import { DEVELOPMENT_FEATURE_GROUPS, FEATURES, LAUNCH_FEATURE_GROUPS, LAUNCH_LABEL, type Category, type FeatureGroup } from "@/lib/site";

export const metadata: Metadata = { title: "Features" };

const CATEGORY_PILL: Record<Category, { cls: string; label: string }> = {
  core: { cls: "pill-mint", label: "Core" },
  integrations: { cls: "pill-blue", label: "Integrations" },
  team: { cls: "pill-violet", label: "Crew" },
  ai: { cls: "pill-violet", label: "Assistant" },
};

/** One status block (launch or in development): a heading row, then each group as a card. */
function FeatureStatus({
  id,
  title,
  pill,
  mark,
  groups,
  columns = 3,
}: {
  id: string;
  title: string;
  pill: { cls: string; label: string };
  mark: "is-live" | "is-dev";
  groups: FeatureGroup[];
  /** Most columns on wide screens; groups wrap to fewer columns as space runs out. */
  columns?: number;
}) {
  return (
    <section className="feature-status" aria-labelledby={id}>
      <div className="feature-status-head">
        <h3 id={id}>{title}</h3>
        <span className={`pill ${pill.cls}`}>{pill.label}</span>
      </div>
      <div className="feature-groups" style={{ columnCount: columns }}>
        {groups.map((g) => (
          <div className="card feature-group" key={g.title}>
            <h4 className="eyebrow feature-group-title">{g.title}</h4>
            <ul className="feature-list">
              {g.features.map((f) => (
                <li className="feature-item" key={f.title}>
                  <span className={`feature-item-mark ${mark}`} aria-hidden />
                  <h5>{f.title}</h5>
                  <p>{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

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
          <FeatureStatus
            id="launch-features"
            title="Launch features"
            pill={{ cls: "pill-mint", label: "Live at launch" }}
            mark="is-live"
            groups={LAUNCH_FEATURE_GROUPS}
          />
          <FeatureStatus
            id="development-features"
            title="In development"
            pill={{ cls: "pill-blue", label: "Coming after launch" }}
            mark="is-dev"
            groups={DEVELOPMENT_FEATURE_GROUPS}
            columns={2}
          />

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
