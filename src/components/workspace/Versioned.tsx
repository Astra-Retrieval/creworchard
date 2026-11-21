"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { AnyContent, DocFull, Draft, VersionMeta, WorkspaceApi } from "@/lib/workspace-types";

/**
 * Everything the word processor and the spreadsheet share: autosave, saving
 * versions, history, comparing, restoring, and moving between drives.
 *
 * How saving works:
 *   - While you work, your changes are autosaved as a private draft a couple
 *     of seconds after you stop typing. A draft is not a version.
 *   - "Save version" turns the draft into a numbered version everyone sees.
 *   - Any two versions can be compared, and any version restored, which
 *     saves it again as the newest version without deleting anything.
 */

export const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export interface Drive {
  kind: "subsystem" | "integration";
  id: string;
  name: string;
}
/** What the compare view is showing: an older side and a newer side. "draft" is what's in the editor now. */
export type Comparison = { from: number; to: number | "draft" };
type AutosaveState = "idle" | "waiting" | "saving" | "saved" | "failed";

const AUTOSAVE_DELAY = 2000;

export function useVersioned<C extends AnyContent>({
  doc,
  draft,
  api,
  canEdit,
  getContent,
  applyContent,
}: {
  doc: DocFull;
  /** The signed-in person's autosaved draft, if they left unsaved work last time. */
  draft: Draft | null;
  api: WorkspaceApi;
  canEdit: boolean;
  /** The editor's current content as plain data, or null if the editor isn't ready. */
  getContent: () => C | null;
  /** Replace what's in the editor (after a restore, or discarding a draft). null means empty. */
  applyContent: (content: C | null) => void;
}) {
  const [title, setTitleState] = useState(draft?.title ?? doc.title);
  const [head, setHead] = useState(draft?.base_version ?? doc.head_version);
  const [savedAt, setSavedAt] = useState(doc.updated_at);
  const [dirty, setDirty] = useState(Boolean(draft));
  const [autosave, setAutosave] = useState<AutosaveState>(draft ? "saved" : "idle");
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState(doc.subsystem_id ?? doc.integration_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    !draft
      ? null
      : draft.base_version === doc.head_version
        ? `Your unsaved changes from ${fmt(draft.updated_at)} were kept. Save a version to share them, or discard them.`
        : `You have unsaved changes from ${fmt(draft.updated_at)}, but a newer version has been saved since. Copy what you need, then discard your changes to see the newest version.`,
  );
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<VersionMeta[] | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [sides, setSides] = useState<{ before: C | null; after: C | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, start] = useTransition();
  const cache = useRef(new Map<number, C>());

  // The autosave timer reads the latest values through refs, so it never saves stale ones.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title, head, getContent });
  latest.current = { title, head, getContent };
  const epoch = useRef(0); // bumped whenever the draft stops being relevant (saved, restored, discarded)

  const cancelAutosave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    epoch.current++;
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const scheduleAutosave = useCallback(() => {
    if (!canEdit) return;
    if (timer.current) clearTimeout(timer.current);
    setAutosave("waiting");
    const mine = epoch.current;
    timer.current = setTimeout(async () => {
      timer.current = null;
      const content = latest.current.getContent();
      if (!content || mine !== epoch.current) return;
      setAutosave("saving");
      const result = await api.saveDraft({ id: doc.id, title: latest.current.title, content, baseVersion: latest.current.head });
      // Ignore the answer if a save, restore, or newer edit has happened meanwhile.
      if (mine !== epoch.current || timer.current) return;
      setAutosave(result.ok ? "saved" : "failed");
    }, AUTOSAVE_DELAY);
    // `api` is rebuilt on every server render; the document id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, doc.id]);

  /** Call whenever the content changes. */
  const markDirty = useCallback(() => {
    setDirty(true);
    scheduleAutosave();
  }, [scheduleAutosave]);

  const setTitle = (value: string) => {
    setTitleState(value);
    markDirty();
  };

  // Warn before closing the tab only if the latest changes haven't been autosaved yet.
  const unprotected = dirty && autosave !== "saved";
  useEffect(() => {
    if (!unprotected) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unprotected]);

  const loadVersions = useCallback(async () => {
    const result = await api.listVersions(doc.id);
    if (result.ok) setVersions(result.versions);
    else setError(result.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const clean = (version: number, updatedAt: string) => {
    cancelAutosave();
    setHead(version);
    setSavedAt(updatedAt);
    setDirty(false);
    setAutosave("idle");
  };

  const save = useCallback(() => {
    const content = getContent();
    if (!content || !canEdit || saving) return;
    setError(null);
    setNotice(null);
    setSaving(true);
    cancelAutosave();
    start(async () => {
      const result = await api.saveDocument({ id: doc.id, title, content, message, baseVersion: head });
      setSaving(false);
      if (!result.ok) {
        // Still unsaved: keep it protected by autosave.
        scheduleAutosave();
        return setError(result.message);
      }
      cache.current.set(result.version, content);
      clean(result.version, result.updated_at);
      setMessage("");
      setNotice(`Saved as version ${result.version}.`);
      if (versions) void loadVersions();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getContent, canEdit, saving, title, message, head, versions, doc.id, loadVersions, scheduleAutosave]);

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
  const contentOf = async (side: number | "draft"): Promise<C | null> => {
    if (side === "draft") return getContent();
    if (side < 1) return null;
    const cached = cache.current.get(side);
    if (cached) return cached;
    const result = await api.getVersion({ id: doc.id, version: side });
    if (!result.ok) throw new Error(result.message);
    cache.current.set(side, result.content as C);
    return result.content as C;
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
    if (dirty && !window.confirm("You have unsaved changes. Restoring will replace them. Continue?")) return;
    setError(null);
    cancelAutosave();
    start(async () => {
      const result = await api.restoreVersion({ id: doc.id, version, baseVersion: head });
      if (!result.ok) return setError(result.message);
      cache.current.set(result.version, result.content as C);
      applyContent(result.content as C);
      setTitleState(result.title);
      clean(result.version, result.updated_at);
      setComparison(null);
      setNotice(`Version ${version} restored as version ${result.version}. Nothing was deleted.`);
      void loadVersions();
    });
  };

  /** Throws away unsaved changes and goes back to the newest saved version. */
  const discard = () => {
    if (!window.confirm("Discard your unsaved changes and go back to the last saved version?")) return;
    setError(null);
    cancelAutosave();
    start(async () => {
      const [, current] = await Promise.all([api.discardDraft(doc.id), api.getDocument(doc.id)]);
      if (!current.ok) return setError(current.message);
      applyContent(current.document.content as C | null);
      setTitleState(current.document.title);
      clean(current.document.head_version, current.document.updated_at);
      setComparison(null);
      setNotice("Unsaved changes discarded.");
    });
  };

  const move = (value: string, drives: Drive[]) => {
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

  const status = !dirty
    ? head === 0 ? "Not saved yet" : `Version ${head} · saved ${fmt(savedAt)}`
    : autosave === "saved" ? "Changes autosaved · not yet a version"
    : autosave === "saving" ? "Autosaving…"
    : autosave === "failed" ? "Autosave failed · save a version to keep your changes"
    : "Unsaved changes";

  return {
    title, setTitle, head, dirty, autosave, status, message, setMessage, location, error, notice, showHistory, versions,
    comparison, setComparison, sides, saving, pending, canEdit,
    markDirty, save, toggleHistory, compare, restore, discard, move,
  };
}

export type Versioned = ReturnType<typeof useVersioned>;

export const sideLabel = (side: number | "draft") => (side === "draft" ? "Unsaved changes" : side === 0 ? "Empty" : `Version ${side}`);

function DriveOptions({ drives }: { drives: Drive[] }) {
  return (
    <>
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
    </>
  );
}
export { DriveOptions };

/** The bar across the top: title, status, where it's saved, and the save, history, and print buttons. */
export function VersionedHeader({ v, drives, backHref, print = true }: { v: Versioned; drives: Drive[]; backHref: string; print?: boolean }) {
  return (
    <>
      <header className="doc-head">
        <Link href={backHref} className="doc-back" aria-label="Back to documents">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
        </Link>
        <div className="doc-head-main">
          <label htmlFor="doc-title" className="sr-only">Title</label>
          <input id="doc-title" className="doc-title" type="text" value={v.title} maxLength={160} readOnly={!v.canEdit} onChange={(e) => v.setTitle(e.target.value)} />
          <div className="doc-meta">
            <span role="status" data-dirty={v.dirty} data-autosave={v.autosave}>{v.status}</span>
            {v.dirty && v.canEdit && (
              <button type="button" className="ws-text-btn" disabled={v.pending} onClick={v.discard}>Discard changes</button>
            )}
            <span aria-hidden="true">·</span>
            <label htmlFor="doc-location">Saved in</label>
            <select id="doc-location" className="doc-select" value={v.location} disabled={!v.canEdit || v.pending} onChange={(e) => v.move(e.target.value, drives)}>
              <DriveOptions drives={drives} />
            </select>
          </div>
        </div>
        <div className="doc-actions">
          {v.canEdit && (
            <>
              <label htmlFor="doc-message" className="sr-only">What changed (optional)</label>
              <input id="doc-message" className="doc-message" type="text" value={v.message} maxLength={200} placeholder="What changed? (optional)" onChange={(e) => v.setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && v.dirty && v.save()} />
              <button type="button" className="btn btn-primary doc-btn" onClick={v.save} disabled={v.saving || !v.dirty || !v.title.trim()}>
                {v.saving ? "Saving…" : "Save version"}
              </button>
            </>
          )}
          <button type="button" className="btn btn-ghost doc-btn" aria-pressed={v.showHistory} onClick={v.toggleHistory}>History</button>
          {print && <button type="button" className="btn btn-ghost doc-btn" onClick={() => window.print()}>Print</button>}
        </div>
      </header>
      {v.error && <div className="notice notice-error doc-notice" role="alert">{v.error}</div>}
      {v.notice && !v.error && <div className="notice notice-success doc-notice" role="status">{v.notice}</div>}
    </>
  );
}

/** The heading of the compare view: what's being compared, a summary, and the way back. */
export function CompareHead({ v, summary }: { v: Versioned; summary: { added: number; removed: number; changed: number } | null }) {
  const c = v.comparison!;
  return (
    <div className="doc-compare-head">
      <div>
        <p className="eyebrow" style={{ margin: "0 0 6px", fontSize: 12 }}>Comparing</p>
        <h2 className="doc-compare-title">{sideLabel(c.from)} → {sideLabel(c.to)}</h2>
        {summary && (
          <p className="doc-compare-summary">
            {summary.added + summary.removed + summary.changed === 0
              ? "No differences."
              : <><span className="diff-added-text">{summary.added} added</span> · <span className="diff-removed-text">{summary.removed} removed</span> · {summary.changed} edited</>}
          </p>
        )}
      </div>
      <div className="row" style={{ gap: 8 }}>
        {v.canEdit && c.from >= 1 && c.from !== v.head && (
          <button type="button" className="btn btn-ghost doc-btn" disabled={v.pending} onClick={() => v.restore(c.from)}>Restore version {c.from}</button>
        )}
        <button type="button" className="btn btn-primary doc-btn" onClick={() => v.setComparison(null)}>{v.canEdit ? "Back to editing" : "Back"}</button>
      </div>
    </div>
  );
}

/** The list of saved versions down the right-hand side. */
export function HistoryPanel({ v }: { v: Versioned }) {
  if (!v.showHistory) return null;
  return (
    <aside className="doc-history" aria-label="Version history">
      <div className="doc-history-head">
        <h2>Version history</h2>
        <p className="hint">Every saved version is kept. Restoring adds a new version; it never deletes one.</p>
      </div>
      {v.dirty && v.head > 0 && (
        <button type="button" className="doc-version doc-version-draft" onClick={() => v.compare({ from: v.head, to: "draft" })}>
          <span className="doc-version-top"><strong>Unsaved changes</strong></span>
          <span className="doc-version-note">See what you&apos;ve changed since version {v.head}</span>
        </button>
      )}
      {!v.versions && <p className="muted" style={{ padding: "0 16px" }}>Loading…</p>}
      {v.versions?.length === 0 && <p className="muted" style={{ padding: "0 16px" }}>No versions yet. Save a version to create the first.</p>}
      <ol className="doc-versions">
        {v.versions?.map((ver) => (
          <li key={ver.version} className="doc-version" data-current={ver.version === v.head}>
            <span className="doc-version-top">
              <strong>Version {ver.version}</strong>
              {ver.version === v.head && <span className="pill pill-mint doc-pill">Current</span>}
              {ver.restored_from && <span className="pill pill-gold doc-pill">Restore</span>}
            </span>
            <span className="doc-version-note">{ver.message || (ver.version === 1 ? "First version" : "No note")}</span>
            <span className="doc-version-meta">{ver.author} · {fmt(ver.created_at)}</span>
            <span className="doc-version-actions">
              <button type="button" className="ws-text-btn" disabled={v.pending} onClick={() => v.compare({ from: ver.version - 1, to: ver.version })}>What changed</button>
              {ver.version !== v.head && (
                <button type="button" className="ws-text-btn" disabled={v.pending} onClick={() => v.compare({ from: ver.version, to: v.dirty ? "draft" : v.head })}>Compare to now</button>
              )}
              {v.canEdit && ver.version !== v.head && (
                <button type="button" className="ws-text-btn" disabled={v.pending} onClick={() => v.restore(ver.version)}>Restore</button>
              )}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
