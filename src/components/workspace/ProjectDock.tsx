"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/waitlist/actions";
import { Modal } from "./Modal";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;
type Kind = "feature_request" | "question";

const COPY: Record<Kind, { eyebrow: string; title: string; label: string; placeholder: string; submit: string }> = {
  feature_request: {
    eyebrow: "Feature request",
    title: "What should we build?",
    label: "Your request",
    placeholder: "I'd like to be able to…",
    submit: "Send request",
  },
  question: {
    eyebrow: "Question",
    title: "Ask us anything",
    label: "Your question",
    placeholder: "How do I…",
    submit: "Send question",
  },
};

/**
 * The row of buttons in the bottom right of every project page: user
 * settings, feature requests, questions, and back to the organization.
 */
export function ProjectDock({ orgHref, sendFeedback }: { orgHref: string; sendFeedback: Action }) {
  const [kind, setKind] = useState<Kind | null>(null);
  // A fresh form each time a dialog opens, so an old "sent" message doesn't linger.
  const [opened, setOpened] = useState(0);
  const openDialog = (next: Kind) => {
    setKind(next);
    setOpened((n) => n + 1);
  };

  return (
    <>
      <nav className="ws-dock" aria-label="Project shortcuts">
        <Link href="/account" className="ws-dock-btn">
          <Icon d="M8 8a3 3 0 100-6 3 3 0 000 6zM2.5 14c.6-2.6 2.8-4 5.5-4s4.9 1.4 5.5 4" />
          <span>User settings</span>
        </Link>
        <button type="button" className="ws-dock-btn" onClick={() => openDialog("feature_request")}>
          <Icon d="M8 1.5a4.5 4.5 0 00-2.5 8.2V11.5h5V9.7A4.5 4.5 0 008 1.5zM6 14h4" />
          <span>Feature requests</span>
        </button>
        <button type="button" className="ws-dock-btn" onClick={() => openDialog("question")}>
          <Icon d="M6 6a2 2 0 113 1.7c-.6.4-1 .8-1 1.6M8 12v.1M8 14.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13z" />
          <span>Questions</span>
        </button>
        <Link href={orgHref} className="ws-dock-btn">
          <Icon d="M2 14V5l6-3.5L14 5v9M6 14v-4h4v4" />
          <span>Organization</span>
        </Link>
      </nav>

      <Modal
        open={kind !== null}
        onClose={() => setKind(null)}
        eyebrow={kind ? COPY[kind].eyebrow : undefined}
        title={kind ? COPY[kind].title : ""}
      >
        {kind && <FeedbackForm key={opened} kind={kind} action={sendFeedback} onClose={() => setKind(null)} />}
      </Modal>
    </>
  );
}

function FeedbackForm({ kind, action, onClose }: { kind: Kind; action: Action; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" as const });
  const copy = COPY[kind];

  if (state.status === "success") {
    return (
      <div className="form">
        <div className="notice notice-success" role="status">{state.message}</div>
        <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="kind" value={kind} />
      <div className="field">
        <label htmlFor="feedback-message">{copy.label}</label>
        <textarea id="feedback-message" name="message" maxLength={3800} placeholder={copy.placeholder} rows={5} required autoFocus />
      </div>
      {state.status === "error" && <div className="notice notice-error" role="alert">{state.message}</div>}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Sending…" : copy.submit}
      </button>
    </form>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
