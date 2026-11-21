"use client";

import { useState, useTransition } from "react";
import type { Abilities, DocSummary, IntegrationNode, Person, Pin, SubsystemNode, WorkspaceApi } from "@/lib/workspace-types";
import { BomTable } from "./BomTable";
import { DocumentManager } from "./DocumentManager";
import { CloseButton, Modal } from "./Modal";
import { ContactList, personName } from "./people";

export type Selection = { kind: "subsystem" | "integration"; id: string };

/**
 * The bar on the right of the canvas for whatever is selected.
 *   Sub-system   people, documents, bill of materials, and any pinned documents
 *   Integration  people (grouped by sub-system) and documents
 */
export function SelectionPanel({
  subsystem,
  integration,
  subsystems,
  people,
  documents,
  pins,
  abilities,
  api,
  onClose,
}: {
  subsystem: SubsystemNode | null;
  integration: IntegrationNode | null;
  subsystems: SubsystemNode[];
  people: Person[];
  documents: DocSummary[];
  pins: Pin[];
  abilities: Abilities;
  api: WorkspaceApi;
  onClose: () => void;
}) {
  const [showPeople, setShowPeople] = useState(false);
  /** Which dialog is open: the document manager (optionally on one document), or the BoM. */
  const [dialog, setDialog] = useState<{ kind: "documents"; openId: string | null } | { kind: "bom" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (action: () => Promise<{ ok: true } | { ok: false; message: string }>) => {
    setError(null);
    start(async () => {
      const result = await action();
      if (!result.ok) setError(result.message);
    });
  };

  const name = subsystem?.name ?? integration?.name ?? "";
  const scope = subsystem ? { subsystemId: subsystem.id } : { integrationId: integration!.id };
  const ownDocuments = documents.filter((d) => (subsystem ? d.subsystem_id === subsystem.id : d.integration_id === integration!.id));
  const memberIds = subsystem?.member_ids ?? integration?.member_ids ?? [];
  const members = people.filter((p) => memberIds.includes(p.user_id));

  const pinned = subsystem
    ? pins.filter((p) => p.subsystem_id === subsystem.id).map((p) => documents.find((d) => d.id === p.document_id)).filter((d): d is DocSummary => Boolean(d))
    : [];
  const pinnable = subsystem ? documents.filter((d) => !pinned.some((p) => p.id === d.id)) : [];
  const assignable = subsystem ? people.filter((p) => !subsystem.member_ids.includes(p.user_id)) : [];
  const connected = integration ? subsystems.filter((s) => integration.subsystem_ids.includes(s.id)) : [];

  return (
    <aside className="ws-panel" aria-label={`${name} details`}>
      <div className="ws-panel-head">
        <div style={{ minWidth: 0 }}>
          <p className="ws-panel-kind">
            {subsystem ? <><span className={`ws-dot ws-color-${subsystem.color}`} aria-hidden="true" /> Sub-system</> : "Integration"}
          </p>
          <h2 className="ws-panel-title">{name}</h2>
          {subsystem?.note && <p className="ws-panel-note">{subsystem.note}</p>}
          {integration && <p className="ws-panel-note">Connects {connected.map((s) => s.name).join(", ")}</p>}
        </div>
        <CloseButton onClick={onClose} label="Close panel" />
      </div>

      <div className="ws-panel-items">
        <button type="button" className="ws-panel-item" aria-expanded={showPeople} onClick={() => setShowPeople((v) => !v)}>
          <span>People</span>
          <span className="ws-panel-count">{members.length}</span>
        </button>

        {showPeople && subsystem && (
          <div className="ws-panel-section">
            {members.length === 0 ? <p className="hint">Nobody is assigned yet.</p> : (
              <ContactList
                people={members}
                onRemove={abilities.editContent ? (userId) => run(() => api.setSubsystemMember({ subsystemId: subsystem.id, userId, assigned: false })) : undefined}
              />
            )}
            {abilities.editContent && assignable.length > 0 && (
              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="panel-add-person">Assign someone from the project</label>
                <select
                  id="panel-add-person"
                  value=""
                  disabled={pending}
                  onChange={(e) => {
                    const userId = e.target.value;
                    if (userId) run(() => api.setSubsystemMember({ subsystemId: subsystem.id, userId, assigned: true }));
                  }}
                >
                  <option value="">Choose a person…</option>
                  {assignable.map((p) => <option key={p.user_id} value={p.user_id}>{personName(p)}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {showPeople && integration && (
          <div className="ws-panel-section">
            {connected.map((s) => {
              const group = members.filter((p) => s.member_ids.includes(p.user_id));
              return (
                <div key={s.id} className="ws-panel-group">
                  <p className="ws-panel-group-title"><span className={`ws-dot ws-color-${s.color}`} aria-hidden="true" /> {s.name}</p>
                  {group.length === 0 ? <p className="hint">Nobody from this sub-system.</p> : <ContactList people={group} />}
                </div>
              );
            })}
          </div>
        )}

        <button type="button" className="ws-panel-item" onClick={() => setDialog({ kind: "documents", openId: null })}>
          <span>Documents</span>
          <span className="ws-panel-count">{ownDocuments.length}</span>
        </button>

        {subsystem && (
          <button type="button" className="ws-panel-item" onClick={() => setDialog({ kind: "bom" })}>
            <span>Bill of materials</span>
          </button>
        )}

        {pinned.map((d) => (
          <div key={d.id} className="ws-panel-pinned">
            <button type="button" className="ws-panel-item" onClick={() => setDialog({ kind: "documents", openId: d.id })}>
              <span>{d.title}</span>
            </button>
            {abilities.editContent && (
              <button
                type="button"
                className="ws-text-btn"
                disabled={pending}
                onClick={() => run(() => api.setPin({ subsystemId: subsystem!.id, documentId: d.id, pinned: false }))}
                aria-label={`Remove ${d.title} from this sidebar`}
              >
                Unpin
              </button>
            )}
          </div>
        ))}

        {subsystem && abilities.editContent && (
          <div className="field ws-panel-add">
            <label htmlFor="panel-pin">Add a document to this sidebar</label>
            <select
              id="panel-pin"
              value=""
              disabled={pending || pinnable.length === 0}
              onChange={(e) => {
                const documentId = e.target.value;
                if (documentId) run(() => api.setPin({ subsystemId: subsystem.id, documentId, pinned: true }));
              }}
            >
              <option value="">{pinnable.length === 0 ? "No other documents yet" : "Choose a document…"}</option>
              {pinnable.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
        )}

        {error && <div className="notice notice-error" role="alert">{error}</div>}
      </div>

      <Modal open={dialog?.kind === "documents"} onClose={() => setDialog(null)} eyebrow={`${name} · Documents`} title="Document manager" wide>
        {dialog?.kind === "documents" && (
          <DocumentManager
            // Pinned documents can come from any drive, so offer the pinned one alongside this drive's.
            documents={dialog.openId && !ownDocuments.some((d) => d.id === dialog.openId) ? [...documents.filter((d) => d.id === dialog.openId), ...ownDocuments] : ownDocuments}
            scope={scope}
            api={api}
            canEdit={abilities.editContent}
            initialId={dialog.openId}
          />
        )}
      </Modal>

      <Modal open={dialog?.kind === "bom"} onClose={() => setDialog(null)} eyebrow={`${name} · Sub-system`} title="Bill of materials" wide>
        {dialog?.kind === "bom" && subsystem && <BomTable subsystemId={subsystem.id} api={api} canEdit={abilities.editContent} />}
      </Modal>
    </aside>
  );
}
