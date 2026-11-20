import Link from "next/link";
import { HEADLINE, LAUNCH_LABEL, ONE_LINER, SUB_LINE, EARLY_BIRD } from "@/lib/site";

export default function HomePage() {
  return (
    <section className="hero">
      <div className="container hero-content">
        <p className="eyebrow">Status · Pre-launch</p>
        <h1>{HEADLINE}</h1>
        <p className="lede">
          <strong>Crew Orchard</strong> is {ONE_LINER.charAt(0).toLowerCase() + ONE_LINER.slice(1)} {SUB_LINE}
        </p>
        <div className="hero-meta">
          <span className="pill pill-mint">Launching {LAUNCH_LABEL}</span>
          <span className="pill pill-gold">Early bird ${EARLY_BIRD.price}/seat for life</span>
        </div>
        <div className="hero-actions">
          <Link href="/waitlist" className="btn btn-primary">
            Sign up for the waitlist
          </Link>
          <Link href="/features" className="btn btn-ghost">
            See the plan
          </Link>
        </div>
      </div>
      <div className="hero-photo" aria-hidden />
    </section>
  );
}
