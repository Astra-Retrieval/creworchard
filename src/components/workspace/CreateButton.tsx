"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormState } from "@/app/waitlist/actions";
import { Modal } from "./Modal";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;
type Kind = "subsystem" | "integration";
const IDLE: FormState = { status: "idle" };

/**
 * The "New" button that sits in two corners of the canvas. It opens one
 * dialog where you choose what to create: a sub-system, or an integration
 * between two existing sub-systems.
 */
export function CreateButton({
  subsystems,
  createSubsystem,
  createIntegration,
}: {
  subsystems: { id: string; name: string }[];
  createSubsystem: Action;
  createIntegration: Action;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("subsystem");

  return (
    <>
      <button type="button" className="btn btn-primary ws-create" onClick={() => setOpen(true)}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        New
      </button>

      <Modal open={open} onClose={() => setOpen(false)} eyebrow="Add to canvas" title={kind === "subsystem" ? "New sub-system" : "New integration"}>
        <div className="segmented" role="group" aria-label="What to create" style={{ marginBottom: 18 }}>
          <button type="button" aria-pressed={kind === "subsystem"} onClick={() => setKind("subsystem")}>Sub-system</button>
          <button type="button" aria-pressed={kind === "integration"} onClick={() => setKind("integration")}>Integration</button>
        </div>
        {kind === "subsystem" ? (
          <SubsystemForm action={createSubsystem} onDone={() => setOpen(false)} />
        ) : (
          <IntegrationForm action={createIntegration} subsystems={subsystems} onDone={() => setOpen(false)} />
        )}
      </Modal>
    </>
  );
}

function SubsystemForm({ action, onDone }: { action: Action; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  useEffect(() => {
    if (state.status === "success") onDone();
    // onDone is recreated every render; only a new result should close the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="form">
      <div className="field">
        <label htmlFor="new-subsystem-name">Sub-system name</label>
        <input id="new-subsystem-name" name="name" type="text" maxLength={120} placeholder="Propulsion" required autoFocus />
      </div>
      {state.status === "error" && <div className="notice notice-error" role="alert">{state.message}</div>}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Adding…" : "Add sub-system"}
      </button>
    </form>
  );
}

function IntegrationForm({
  action,
  subsystems,
  onDone,
}: {
  action: Action;
  subsystems: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  useEffect(() => {
    if (state.status === "success") onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (subsystems.length < 2) {
    return (
      <div className="notice notice-info">
        An integration connects two sub-systems. Create {subsystems.length === 0 ? "two sub-systems" : "one more sub-system"} first.
      </div>
    );
  }

  return (
    <form action={formAction} className="form">
      <div className="field-row">
        <div className="field">
          <label htmlFor="new-integration-source">From</label>
          <select id="new-integration-source" name="source_id" defaultValue={subsystems[0].id} required>
            {subsystems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="new-integration-target">To</label>
          <select id="new-integration-target" name="target_id" defaultValue={subsystems[1].id} required>
            {subsystems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="new-integration-name">Name (optional)</label>
        <input id="new-integration-name" name="name" type="text" maxLength={120} placeholder="Power bus" />
      </div>
      {state.status === "error" && <div className="notice notice-error" role="alert">{state.message}</div>}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Adding…" : "Add integration"}
      </button>
    </form>
  );
}
