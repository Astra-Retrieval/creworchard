"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DocSummary, WorkspaceApi } from "@/lib/workspace-types";
import type { Drive } from "./DocumentEditor";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * A list of documents, each opening in the word processor, with a form to
 * start a new one. Used on the Documents tab (every drive, with a choice of
 * where to save) and in the canvas side panel (one sub-system or integration).
 */
export function DocumentList({
  documents,
  drives,
  fixedDrive,
  documentsHref,
  api,
  canEdit,
  empty = "No documents here yet.",
}: {
  documents: DocSummary[];
  /** Every sub-system and integration, to label each document and to offer as a place to save. */
  drives: Drive[];
  /** Set in the side panel: new documents are saved here and no choice is offered. null = project drive. */
  fixedDrive?: Drive | null;
  /** The Documents tab's address; a document opens at `${documentsHref}/${id}`. */
  documentsHref: string;
  api: WorkspaceApi;
  canEdit: boolean;
  empty?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [driveId, setDriveId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const driveOf = (d: DocSummary) => drives.find((x) => x.id === (d.subsystem_id ?? d.integration_id));
  const target = fixedDrive !== undefined ? fixedDrive : drives.find((d) => d.id === driveId) ?? null;

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await api.createDocument({
        title,
        subsystemId: target?.kind === "subsystem" ? target.id : null,
        integrationId: target?.kind === "integration" ? target.id : null,
      });
      if (!result.ok) return setError(result.message);
      router.push(`${documentsHref}/${result.id}`);
    });
  };

  return (
    <div className="doc-list">
      {canEdit && (
        <form onSubmit={create} className="doc-new">
          <div className="field">
            <label htmlFor="new-doc-title">New document</label>
            <input id="new-doc-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Title" required />
          </div>
          {fixedDrive === undefined && (
            <div className="field">
              <label htmlFor="new-doc-drive">Save in</label>
              <select id="new-doc-drive" value={driveId} onChange={(e) => setDriveId(e.target.value)}>
                <option value="">Project drive</option>
                {drives.some((d) => d.kind === "subsystem") && (
                  <optgroup label="Sub-systems">
                    {drives.filter((d) => d.kind === "subsystem").map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </optgroup>
                )}
                {drives.some((d) => d.kind === "integration") && (
                  <optgroup label="Integrations">
                    {drives.filter((d) => d.kind === "integration").map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
          )}
          <button className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create and open"}</button>
        </form>
      )}
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      {documents.length === 0 ? (
        <div className="ws-section-empty" style={{ margin: 0 }}>{empty}</div>
      ) : (
        <ul className="doc-rows">
          {documents.map((d) => {
            const drive = driveOf(d);
            return (
              <li key={d.id}>
                <Link href={`${documentsHref}/${d.id}`} className="doc-row">
                  <span className="doc-row-title">{d.title}</span>
                  <span className="doc-row-meta">
                    <span className={`pill doc-pill ${drive ? (drive.kind === "subsystem" ? "pill-blue" : "pill-dust") : "pill-mint"}`}>
                      {drive ? drive.name : "Project"}
                    </span>
                    <span>{d.head_version > 0 ? `v${d.head_version}` : "Not saved yet"}</span>
                    <span>{fmt(d.updated_at)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
