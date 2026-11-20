"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/app/contact/actions";

/**
 * Contact form used on the home page and the member dashboard. For signed-in
 * members the name and email arrive pre-filled.
 */
export function ContactForm({ defaultName = "", defaultEmail = "" }: { defaultName?: string; defaultEmail?: string }) {
  const [state, action, pending] = useActionState(sendContactMessage, { status: "idle" as const });

  if (state.status === "success") {
    return (
      <div className="card stack-sm">
        <p className="eyebrow" style={{ margin: 0 }}>Signal received</p>
        <div className="notice notice-success" role="status">{state.message}</div>
      </div>
    );
  }

  return (
    <form action={action} className="form card" noValidate>
      <div className="field-row">
        <div className="field">
          <label htmlFor="c-name">Name</label>
          <input id="c-name" name="name" type="text" autoComplete="name" defaultValue={defaultName} maxLength={120} required />
        </div>
        <div className="field">
          <label htmlFor="c-email">Email</label>
          <input id="c-email" name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-topic">Topic</label>
        <select id="c-topic" name="topic" defaultValue="general">
          <option value="general">General question</option>
          <option value="billing">Billing or my seat</option>
          <option value="support">Help with my account</option>
          <option value="partnership">Partnership</option>
          <option value="press">Press</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="c-message">Message</label>
        <textarea id="c-message" name="message" maxLength={4000} required />
      </div>
      {/* Honeypot: hidden from people, tempting to bots */}
      <div className="sr-only" aria-hidden>
        <label htmlFor="c-site">Company website</label>
        <input id="c-site" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {state.status === "error" && <div className="notice notice-error" role="alert">{state.message}</div>}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Transmitting…" : "Send message"}
      </button>
    </form>
  );
}
