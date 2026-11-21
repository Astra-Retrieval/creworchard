"use client";

import { useEffect, useState, useTransition } from "react";
import type { DocFull, DocScope, DocSummary, WorkspaceApi } from "@/lib/workspace-types";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * The document manager: a list of documents on the left, and the open
 * document on the right, edited in place. New documents are created in
 * `scope` (the project drive, or one sub-system's or integration's drive).
 */
export function DocumentManager({
  documents,
  scope,
  scopeLabel,
  api,
  canEdit,
  initialId = null,
}: {
  documents: DocSummary[];
  scope: DocScope;
  /** Shown beside each document when the list mixes drives (the Documents tab). */
  scopeLabel?: (doc: DocSummary) => string;
  api: WorkspaceApi;
  canEdit: boolean;
  initialId?: string | null;
}) {
  const [activeId, setActiveId] = useState<string | null>(initialId);
  const [doc, setDoc] = useState<DocFull | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();

  // Load the document whenever a different one is opened.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getDocument(activeId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setDoc(null);
        setError(result.message);
        return;
      }
      setDoc(result.document);
      setTitle(result.document.title);
      setBody(result.document.body);
      setSavedAt(result.document.updated_at);
    });
    return () => {
      cancelled = true;
    };
    // `api` is rebuilt on every server render; only a different document should reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const dirty = doc !== null && (title !== doc.title || body !== doc.body);

  const open = (id: string) => {
    if (id === activeId) return;
    if (dirty && !window.confirm("You have unsaved changes in this document. Leave without saving?")) return;
    setDoc(null);
    setActiveId(id);
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await api.createDocument({ title: newTitle, ...scope });
      if (!result.ok) return setError(result.message);
      setNewTitle("");
      setDoc(null);
      setActiveId(result.id);
    });
  };

  const save = () => {
    if (!doc) return;
    setError(null);
    start(async () => {
      const result = await api.saveDocument({ id: doc.id, title, body });
      if (!result.ok) return setError(result.message);
      setDoc({ ...doc, title: title.trim(), body, updated_at: result.updated_at });
      setTitle(title.trim());
      setSavedAt(result.updated_at);
    });
  };

  return (
    <div className="ws-docs">
      <div className="ws-docs-list">
        {documents.length === 0 ? (
          <p className="hint">No documents here yet.</p>
        ) : (
          <ul>
            {documents.map((d) => (
              <li key={d.id}>
                <button type="button" className="ws-doc-row" aria-current={d.id === activeId ? "true" : undefined} onClick={() => open(d.id)}>
                  <span className="ws-doc-title">{d.id === doc?.id ? doc.title : d.title}</span>
                  <span className="ws-doc-meta">
                    {scopeLabel ? `${scopeLabel(d)} · ` : ""}
                    {fmt(d.updated_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <form onSubmit={create} className="ws-docs-new">
            <label htmlFor="new-doc-title" className="sr-only">New document title</label>
            <input id="new-doc-title" type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={160} placeholder="New document title" required />
            <button className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: 14 }} disabled={pending}>Add</button>
          </form>
        )}
      </div>

      <div className="ws-docs-editor">
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {!activeId && !error && (
          <div className="ws-section-empty" style={{ margin: 0 }}>
            {documents.length === 0 ? (canEdit ? "Add a document to get started." : "Nothing to open yet.") : "Choose a document to open it."}
          </div>
        )}
        {activeId && loading && <p className="muted">Opening…</p>}
        {doc && !loading && (
          <>
            <label htmlFor="doc-title" className="sr-only">Title</label>
            <input id="doc-title" className="ws-doc-title-input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} readOnly={!canEdit} />
            <label htmlFor="doc-body" className="sr-only">Document text</label>
            <textarea id="doc-body" className="ws-doc-body" value={body} onChange={(e) => setBody(e.target.value)} readOnly={!canEdit} placeholder={canEdit ? "Start writing…" : "This document is empty."} />
            <div className="ws-docs-foot">
              <span className="muted small" role="status">
                {dirty ? "Unsaved changes" : savedAt ? `Saved ${fmt(savedAt)}` : ""}
              </span>
              {canEdit && (
                <button type="button" className="btn btn-primary" style={{ padding: "10px 22px", fontSize: 14 }} onClick={save} disabled={pending || !dirty || !title.trim()}>
                  {pending ? "Saving…" : "Save"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
