"use client";

import { useActionState, useState } from "react";
import { createEarlyBirdAccount, joinWaitlist, type FormState } from "./actions";
import { EARLY_BIRD, LAUNCH_LABEL, TIERS } from "@/lib/site";

const initial: FormState = { status: "idle" };
type Mode = "waitlist" | "early_bird";

function Notice({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <div className={`notice ${state.status === "success" ? "notice-success" : "notice-error"}`} role="status" aria-live="polite">
      {state.message}
    </div>
  );
}

export function WaitlistForms({ initialMode, notice }: { initialMode: Mode; notice?: string }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [seats, setSeats] = useState(1);
  const [wState, wAction, wPending] = useActionState(joinWaitlist, initial);
  const [eState, eAction, ePending] = useActionState(createEarlyBirdAccount, initial);
  const waitlistPrice = TIERS.find((t) => t.id === "waitlist")!.price;

  return (
    <div className="card">
      <div className="segmented" role="group" aria-label="Choose how to sign up">
        <button type="button" aria-pressed={mode === "waitlist"} onClick={() => setMode("waitlist")}>
          Waitlist · ${waitlistPrice}
        </button>
        <button type="button" aria-pressed={mode === "early_bird"} onClick={() => setMode("early_bird")}>
          Early bird · ${EARLY_BIRD.price}
        </button>
      </div>

      {notice && <div className="notice notice-info" style={{ marginBottom: 18 }}>{notice}</div>}

      {mode === "waitlist" ? (
        wState.status === "success" ? (
          <div className="stack">
            <p className="eyebrow" style={{ margin: 0 }}>Signal received</p>
            <h2 style={{ fontSize: 26 }}>You&apos;re on the list</h2>
            <Notice state={wState} />
            <p className="muted">
              Want the lower lifetime price instead?{" "}
              <button type="button" className="btn btn-ghost" style={{ padding: "6px 14px", marginLeft: 6 }} onClick={() => setMode("early_bird")}>
                Switch to early bird
              </button>
            </p>
          </div>
        ) : (
          <form action={wAction} className="form" noValidate>
            <p className="muted" style={{ margin: 0 }}>
              Free to join. At launch we&apos;ll email you a code that unlocks <strong style={{ color: "var(--starlight)" }}>${waitlistPrice} per seat, per month</strong>.
            </p>
            <div className="field-row">
              <div className="field">
                <label htmlFor="w-name">Full name</label>
                <input id="w-name" name="full_name" type="text" autoComplete="name" required />
              </div>
              <div className="field">
                <label htmlFor="w-email">Email</label>
                <input id="w-email" name="email" type="email" autoComplete="email" required />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="w-org">Organization <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                <input id="w-org" name="organization" type="text" autoComplete="organization" />
              </div>
              <div className="field">
                <label htmlFor="w-use">Use</label>
                <select id="w-use" name="use_case" defaultValue="" required>
                  <option value="" disabled>Choose one</option>
                  <option value="commercial">Commercial</option>
                  <option value="government">Government</option>
                  <option value="academic">Academic (.edu)</option>
                  <option value="hobby">Hobby</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="w-seats">Expected seats</label>
              <input id="w-seats" name="seats" type="number" min={1} max={500} defaultValue={1} />
            </div>
            <div className="field">
              <label htmlFor="w-notes">What are you building? <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <textarea id="w-notes" name="notes" maxLength={1000} />
            </div>
            {/* Honeypot: hidden from people, tempting to bots */}
            <div className="sr-only" aria-hidden>
              <label htmlFor="w-site">Company website</label>
              <input id="w-site" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <Notice state={wState} />
            <button className="btn btn-primary btn-block" disabled={wPending}>
              {wPending ? "Transmitting…" : "Join the waitlist"}
            </button>
          </form>
        )
      ) : (
        <form action={eAction} className="form" noValidate>
          <p className="muted" style={{ margin: 0 }}>
            Create your account now and lock in <strong style={{ color: "var(--mint)" }}>${EARLY_BIRD.price} per seat, per month, for life</strong>.
            You won&apos;t be charged until launch on {LAUNCH_LABEL}.
          </p>
          <div className="field-row">
            <div className="field">
              <label htmlFor="e-name">Full name</label>
              <input id="e-name" name="full_name" type="text" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="e-org">Organization <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <input id="e-org" name="organization" type="text" autoComplete="organization" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="e-email">Email</label>
              <input id="e-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="e-pass">Password</label>
              <input id="e-pass" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="e-seats">Seats</label>
            <input
              id="e-seats"
              name="seats"
              type="number"
              min={1}
              max={500}
              value={seats}
              onChange={(e) => setSeats(Math.min(500, Math.max(1, Number(e.target.value) || 1)))}
            />
            <p className="hint">
              {seats} {seats === 1 ? "seat" : "seats"} × ${EARLY_BIRD.price} ={" "}
              <strong style={{ color: "var(--starlight)" }}>${seats * EARLY_BIRD.price}/month</strong>, starting {LAUNCH_LABEL}.
            </p>
          </div>
          <label className="check">
            <input type="checkbox" name="agree" required />
            <span>
              I understand my card will be saved securely by Stripe today and first charged on {LAUNCH_LABEL}. I can
              close my account before then and pay nothing.
            </span>
          </label>
          <Notice state={eState} />
          <button className="btn btn-primary btn-block" disabled={ePending}>
            {ePending ? "Preparing checkout…" : "Create account and save card"}
          </button>
          <p className="hint center">Payments are handled by Stripe. We never see your card number.</p>
        </form>
      )}
    </div>
  );
}
