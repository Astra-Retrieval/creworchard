"use client";

import { useState, useTransition } from "react";
import type { Person, SubsystemNode, WorkspaceApi } from "@/lib/workspace-types";
import { Modal } from "./Modal";
import { PeopleChecklist, toggleId } from "./people";

type Kind = "subsystem" | "integration";

/**
 * The "New" button that sits in two corners of the canvas. It opens one
 * dialog where you choose what to create: a sub-system, or an integration
 * between two or more existing sub-systems.
 */
export function CreateButton({ subsystems, people, api }: { subsystems: SubsystemNode[]; people: Person[]; api: WorkspaceApi }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("subsystem");
  // A fresh form every time the dialog opens.
  const [opened, setOpened] = useState(0);
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-primary ws-create"
        onClick={() => {
          setOpened((n) => n + 1);
          setOpen(true);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        New
      </button>

      <Modal open={open} onClose={close} eyebrow="Add to canvas" title={kind === "subsystem" ? "New sub-system" : "New integration"}>
        <div className="segmented" role="group" aria-label="What to create" style={{ marginBottom: 18 }}>
          <button type="button" aria-pressed={kind === "subsystem"} onClick={() => setKind("subsystem")}>Sub-system</button>
          <button type="button" aria-pressed={kind === "integration"} onClick={() => setKind("integration")}>Integration</button>
        </div>
        {kind === "subsystem" ? (
          <SubsystemForm key={`s${opened}`} people={people} api={api} onDone={close} />
        ) : (
          <IntegrationForm key={`i${opened}`} subsystems={subsystems} people={people} api={api} onDone={close} />
        )}
      </Modal>
    </>
  );
}

function SubsystemForm({ people, api, onDone }: { people: Person[]; api: WorkspaceApi; onDone: () => void }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await api.createSubsystem({ name, note, memberIds });
      if (result.ok) onDone();
      else setError(result.message);
    });
  };

  return (
    <form onSubmit={submit} className="form">
      <div className="field">
        <label htmlFor="new-subsystem-name">Sub-system name</label>
        <input id="new-subsystem-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Propulsion" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="new-subsystem-note">Quick note (optional)</label>
        <textarea id="new-subsystem-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} rows={2} placeholder="Shown on the box, under the name" style={{ minHeight: 0 }} />
      </div>
      <div className="field">
        <span className="label">People</span>
        <PeopleChecklist
          people={people}
          selected={memberIds}
          onToggle={(id) => setMemberIds((list) => toggleId(list, id))}
          idPrefix="new-subsystem-person"
          empty="Nobody is on this project's team yet. Add people on the Team tab; you can assign them later."
        />
      </div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Adding…" : "Add sub-system"}
      </button>
    </form>
  );
}

/** Two steps: choose the sub-systems to connect, then the people from each. */
function IntegrationForm({
  subsystems,
  people,
  api,
  onDone,
}: {
  subsystems: SubsystemNode[];
  people: Person[];
  api: WorkspaceApi;
  onDone: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [subsystemIds, setSubsystemIds] = useState<string[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (subsystems.length < 2) {
    return (
      <div className="notice notice-info">
        An integration connects two or more sub-systems. Create {subsystems.length === 0 ? "two sub-systems" : "one more sub-system"} first.
      </div>
    );
  }

  const chosen = subsystems.filter((s) => subsystemIds.includes(s.id));

  if (step === 1) {
    return (
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          // Drop anyone picked earlier who isn't on a chosen sub-system any more.
          const allowed = new Set(chosen.flatMap((s) => s.member_ids));
          setMemberIds((list) => list.filter((id) => allowed.has(id)));
          setStep(2);
        }}
      >
        <div className="field">
          <span className="label">Step 1 of 2 · Sub-systems to connect</span>
          <ul className="ws-checklist">
            {subsystems.map((s) => (
              <li key={s.id}>
                <label className="check" htmlFor={`new-integration-sub-${s.id}`}>
                  <input
                    id={`new-integration-sub-${s.id}`}
                    type="checkbox"
                    checked={subsystemIds.includes(s.id)}
                    onChange={() => setSubsystemIds((list) => toggleId(list, s.id))}
                  />
                  <span style={{ color: "var(--starlight)" }}>
                    <span className={`ws-dot ws-color-${s.color}`} aria-hidden="true" /> {s.name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="hint">Choose two or more.</p>
        </div>
        <button className="btn btn-primary btn-block" disabled={subsystemIds.length < 2}>
          Next: choose people
        </button>
      </form>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await api.createIntegration({ name, subsystemIds, memberIds });
      if (result.ok) onDone();
      else setError(result.message);
    });
  };

  return (
    <form onSubmit={submit} className="form">
      <div className="field">
        <label htmlFor="new-integration-name">Step 2 of 2 · Integration name</label>
        <input id="new-integration-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Power bus" required autoFocus />
      </div>
      {chosen.map((s) => (
        <div className="field" key={s.id}>
          <span className="label">
            <span className={`ws-dot ws-color-${s.color}`} aria-hidden="true" /> People from {s.name}
          </span>
          <PeopleChecklist
            people={people.filter((p) => s.member_ids.includes(p.user_id))}
            selected={memberIds}
            onToggle={(id) => setMemberIds((list) => toggleId(list, id))}
            idPrefix={`new-integration-${s.id}`}
            empty="Nobody is assigned to this sub-system yet."
          />
        </div>
      ))}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={pending}>
          {pending ? "Adding…" : "Add integration"}
        </button>
      </div>
    </form>
  );
}
