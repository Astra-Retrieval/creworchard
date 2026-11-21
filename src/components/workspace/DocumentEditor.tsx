"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { diffDocs, diffSummary, emptyDoc, textToDoc, type DocContent } from "@/lib/doc-content";
import type { DocFull, VersionMeta, WorkspaceApi } from "@/lib/workspace-types";
import { EditorPage, Toolbar, WordCount, useRichEditor } from "./RichEditor";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export interface Drive {
  kind: "subsystem" | "integration";
  id: string;
  name: string;
}
/** What the compare view is showing: an older side and a newer side. "draft" is what's in the editor now. */
type Comparison = { from: number; to: number | "draft" };

/**
 * A document open in the word processor, with its version history.
 *
 * Saving works like a commit: each save is a new numbered version with an
 * optional note. Any two versions can be compared, and any version can be
 * restored, which saves it again as the newest version without deleting
 * anything that came after.
 */
export function DocumentEditor({
  document: doc,
  drives,
  api,
  canEdit,
  backHref,
}: {
  document: DocFull;
  drives: Drive[];
  api: WorkspaceApi;
  canEdit: boolean;
  backHref: string;
}) {
  const initial = useMemo<DocContent>(() => doc.content ?? (doc.body ? textToDoc(doc.body) : emptyDoc()), [doc.content, doc.body]);
  const [title, setTitle] = useState(doc.title);
  const [head, setHead] = useState(doc.head_version);
  const [savedAt, setSavedAt] = useState(doc.updated_at);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState(doc.subsystem_id ?? doc.integration_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<VersionMeta[] | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [sides, setSides] = useState<{ before: DocContent | null; after: DocContent | null } | null>(null);
  const [pending, start] = useTransition();
  const [saving, setSaving] = useState(false);
  const cache = useRef(new Map<number, DocContent>());

  const editor = useRichEditor({ content: initial, editable: canEdit, onChange: () => setDirty(true) });

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /**
   * The editor's content as plain data. The editor builds some objects
   * without a prototype, which can't be sent to a server action as they are,
   * so they're copied through JSON first.
   */
  const snapshot = (): DocContent | null => (editor ? (JSON.parse(JSON.stringify(editor.getJSON())) as DocContent) : null);

  const loadVersions = useCallback(async () => {
    const result = await api.listVersions(doc.id);
    if (result.ok) setVersions(result.versions);
    else setError(result.message);
    // `api` is rebuilt on every server render; the document id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const save = useCallback(() => {
    if (!editor || !canEdit || pending) return;
    setError(null);
    setNotice(null);
    setSaving(true);
    start(async () => {
      const content = snapshot()!;
      const result = await api.saveDocument({ id: doc.id, title, content, message, baseVersion: head });
      setSaving(false);
      if (!result.ok) return setError(result.message);
      cache.current.set(result.version, content);
      setHead(result.version);
      setSavedAt(result.updated_at);
      setDirty(false);
      setMessage("");
      setNotice(`Saved as version ${result.version}.`);
      if (versions) void loadVersions();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, canEdit, pending, title, message, head, versions, doc.id, loadVersions]);

  // Ctrl+S / Cmd+S saves a version.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, save]);

  const toggleHistory = () => {
    setShowHistory((open) => !open);
    if (!versions) void loadVersions();
  };

  /** The content of one side of a comparison. Version 0 is "before the first save": nothing. */
  const contentOf = async (side: number | "draft"): Promise<DocContent | null> => {
    if (side === "draft") return snapshot();
    if (side < 1) return null;
    const cached = cache.current.get(side);
    if (cached) return cached;
    const result = await api.getVersion({ id: doc.id, version: side });
    if (!result.ok) throw new Error(result.message);
    cache.current.set(side, result.content);
    return result.content;
  };

  const compare = (next: Comparison) => {
    setError(null);
    setNotice(null);
    setComparison(next);
    setSides(null);
    start(async () => {
      try {
        const [before, after] = await Promise.all([contentOf(next.from), contentOf(next.to)]);
        setSides({ before, after });
      } catch (e) {
        setComparison(null);
        setError(e instanceof Error ? e.message : "That version couldn't be opened.");
      }
    });
  };

  const restore = (version: number) => {
    if (!editor) return;
    if (dirty && !window.confirm("You have unsaved changes. Restoring will replace them. Continue?")) return;
    setError(null);
    start(async () => {
      const result = await api.restoreVersion({ id: doc.id, version, baseVersion: head });
      if (!result.ok) return setError(result.message);
      cache.current.set(result.version, result.content);
      editor.commands.setContent(result.content, { emitUpdate: false });
      setTitle(result.title);
      setHead(result.version);
      setSavedAt(result.updated_at);
      setDirty(false);
      setComparison(null);
      setNotice(`Version ${version} restored as version ${result.version}. Nothing was deleted.`);
      void loadVersions();
    });
  };

  const move = (value: string) => {
    const drive = drives.find((d) => d.id === value);
    const previous = location;
    setLocation(value);
    setError(null);
    start(async () => {
      const result = await api.moveDocument({
        id: doc.id,
        subsystemId: drive?.kind === "subsystem" ? drive.id : null,
        integrationId: drive?.kind === "integration" ? drive.id : null,
      });
      if (!result.ok) {
        setLocation(previous);
        setError(result.message);
      }
    });
  };

  const diff = useMemo(() => (sides ? diffDocs(sides.before, sides.after) : null), [sides]);
  const summary = diff ? diffSummary(diff) : null;
  const sideLabel = (side: number | "draft") => (side === "draft" ? "Unsaved draft" : side === 0 ? "Empty" : `Version ${side}`);
  const status = dirty ? "Unsaved changes" : head === 0 ? "Not saved yet" : `Version ${head} · saved ${fmt(savedAt)}`;

  return (
    <div className={`doc${showHistory ? " has-history" : ""}`}>
      <header className="doc-head">
        <Link href={backHref} className="doc-back" aria-label="Back to documents">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
        </Link>
        <div className="doc-head-main">
          <label htmlFor="doc-title" className="sr-only">Document title</label>
          <input
            id="doc-title"
            className="doc-title"
            type="text"
            value={title}
            maxLength={160}
            readOnly={!canEdit}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
          />
          <div className="doc-meta">
            <span role="status" data-dirty={dirty}>{status}</span>
            <span aria-hidden="true">·</span>
            <label htmlFor="doc-location">Saved in</label>
            <select id="doc-location" className="doc-select" value={location} disabled={!canEdit || pending} onChange={(e) => move(e.target.value)}>
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
        </div>
        <div className="doc-actions">
          {canEdit && (
            <>
              <label htmlFor="doc-message" className="sr-only">What changed (optional)</label>
              <input id="doc-message" className="doc-message" type="text" value={message} maxLength={200} placeholder="What changed? (optional)" onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && dirty && save()} />
              <button type="button" className="btn btn-primary doc-btn" onClick={save} disabled={pending || !dirty || !title.trim()}>
                {saving ? "Saving…" : "Save version"}
              </button>
            </>
          )}
          <button type="button" className="btn btn-ghost doc-btn" aria-pressed={showHistory} onClick={toggleHistory}>History</button>
          <button type="button" className="btn btn-ghost doc-btn" onClick={() => window.print()}>Print</button>
        </div>
      </header>

      {error && <div className="notice notice-error doc-notice" role="alert">{error}</div>}
      {notice && !error && <div className="notice notice-success doc-notice" role="status">{notice}</div>}

      {!comparison && editor && canEdit && <Toolbar editor={editor} />}

      <div className="doc-body">
        <div className="doc-scroll">
          {/* The editor stays mounted while comparing, so the draft and its undo history survive. */}
          <div hidden={Boolean(comparison)}>
            <EditorPage editor={editor} />
          </div>

          {comparison && (
            <div className="doc-page doc-compare">
              <div className="doc-compare-head">
                <div>
                  <p className="eyebrow" style={{ margin: "0 0 6px", fontSize: 12 }}>Comparing</p>
                  <h2 className="doc-compare-title">{sideLabel(comparison.from)} → {sideLabel(comparison.to)}</h2>
                  {summary && (
                    <p className="doc-compare-summary">
                      {summary.added + summary.removed + summary.changed === 0
                        ? "No differences in the text."
                        : <><span className="diff-added-text">{summary.added} added</span> · <span className="diff-removed-text">{summary.removed} removed</span> · {summary.changed} edited</>}
                    </p>
                  )}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {canEdit && comparison.from >= 1 && comparison.from !== head && (
                    <button type="button" className="btn btn-ghost doc-btn" disabled={pending} onClick={() => restore(comparison.from)}>
                      Restore version {comparison.from}
                    </button>
                  )}
                  <button type="button" className="btn btn-primary doc-btn" onClick={() => setComparison(null)}>
                    {canEdit ? "Back to editing" : "Back to document"}
                  </button>
                </div>
              </div>
              {!diff && <p className="muted">Comparing…</p>}
              {diff && (
                <div className="diff" aria-label="Differences">
                  {diff.map((block, i) =>
                    block.kind === "changed" ? (
                      <p key={i} className="diff-block diff-changed">
                        {block.parts.map((part, k) =>
                          part.kind === "same" ? <span key={k}>{part.text}</span> : part.kind === "added" ? <ins key={k}>{part.text}</ins> : <del key={k}>{part.text}</del>,
                        )}
                      </p>
                    ) : (
                      <p key={i} className={`diff-block diff-${block.kind}`}>
                        {block.kind === "added" ? <ins>{block.text}</ins> : block.kind === "removed" ? <del>{block.text}</del> : block.text}
                      </p>
                    ),
                  )}
                  {diff.length === 0 && <p className="muted">Both versions are empty.</p>}
                </div>
              )}
              <p className="hint" style={{ marginTop: 20 }}>Comparison shows changes to the text. Formatting-only changes (such as bold or color) aren&apos;t listed.</p>
            </div>
          )}
        </div>

        {showHistory && (
          <aside className="doc-history" aria-label="Version history">
            <div className="doc-history-head">
              <h2>Version history</h2>
              <p className="hint">Every save is kept. Restoring adds a new version; it never deletes one.</p>
            </div>
            {dirty && head > 0 && (
              <button type="button" className="doc-version doc-version-draft" onClick={() => compare({ from: head, to: "draft" })}>
                <span className="doc-version-top"><strong>Unsaved draft</strong></span>
                <span className="doc-version-note">See what you&apos;ve changed since version {head}</span>
              </button>
            )}
            {!versions && <p className="muted" style={{ padding: "0 16px" }}>Loading…</p>}
            {versions?.length === 0 && <p className="muted" style={{ padding: "0 16px" }}>No versions yet. Save to create the first.</p>}
            <ol className="doc-versions">
              {versions?.map((v) => (
                <li key={v.version} className="doc-version" data-current={v.version === head}>
                  <span className="doc-version-top">
                    <strong>Version {v.version}</strong>
                    {v.version === head && <span className="pill pill-mint doc-pill">Current</span>}
                    {v.restored_from && <span className="pill pill-gold doc-pill">Restore</span>}
                  </span>
                  <span className="doc-version-note">{v.message || (v.version === 1 ? "First version" : "No note")}</span>
                  <span className="doc-version-meta">{v.author} · {fmt(v.created_at)}</span>
                  <span className="doc-version-actions">
                    <button type="button" className="ws-text-btn" disabled={pending} onClick={() => compare({ from: v.version - 1, to: v.version })}>What changed</button>
                    {v.version !== head && (
                      <button type="button" className="ws-text-btn" disabled={pending} onClick={() => compare({ from: v.version, to: dirty ? "draft" : head })}>Compare to now</button>
                    )}
                    {canEdit && v.version !== head && (
                      <button type="button" className="ws-text-btn" disabled={pending} onClick={() => restore(v.version)}>Restore</button>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>

      <footer className="doc-foot">{editor && <WordCount editor={editor} />}</footer>
    </div>
  );
}
