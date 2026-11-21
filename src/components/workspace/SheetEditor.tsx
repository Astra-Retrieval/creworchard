"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { countCells, diffSheets, emptySheets, sheetDiffSummary, type SheetContent } from "@/lib/sheet-content";
import type { DocFull, Draft, WorkspaceApi } from "@/lib/workspace-types";
import type { GridHandle } from "./SheetGrid";
import { CompareHead, HistoryPanel, VersionedHeader, useVersioned, type Drive } from "./Versioned";

// The grid measures the window, so it's only loaded in the browser.
const SheetGrid = dynamic(() => import("./SheetGrid"), { ssr: false, loading: () => <p className="muted" style={{ padding: 24 }}>Opening…</p> });

/**
 * A spreadsheet. Autosave, versions, history, and restore come from
 * Versioned.tsx, exactly as for written documents; this adds the grid and a
 * cell-by-cell comparison.
 */
export function SheetEditor({
  document: doc,
  draft,
  drives,
  api,
  canEdit,
  backHref,
}: {
  document: DocFull;
  draft: Draft | null;
  drives: Drive[];
  api: WorkspaceApi;
  canEdit: boolean;
  backHref: string;
}) {
  // The grid takes its content once, when it appears. To load different
  // content (a restore, or discarding changes) it's replaced with a new grid.
  const [loaded, setLoaded] = useState<{ content: SheetContent; round: number }>(() => ({
    content: (draft?.content as SheetContent | undefined) ?? (doc.content as SheetContent | null) ?? emptySheets(),
    round: 0,
  }));
  const handle = useMemo<GridHandle>(() => ({ read: null }), []);

  const v = useVersioned<SheetContent>({
    doc,
    draft,
    api,
    canEdit,
    getContent: () => handle.read?.() ?? null,
    applyContent: (content) => setLoaded((prev) => ({ content: content ?? emptySheets(), round: prev.round + 1 })),
  });

  const changes = useMemo(() => (v.sides ? diffSheets(v.sides.before, v.sides.after) : null), [v.sides]);
  // Counted from what was loaded, then kept up to date as cells are edited.
  const [edited, setEdited] = useState<{ round: number; cells: number } | null>(null);
  const cells = edited?.round === loaded.round ? edited.cells : countCells(loaded.content);

  return (
    <div className={`doc doc-sheet${v.showHistory ? " has-history" : ""}`}>
      <VersionedHeader v={v} drives={drives} backHref={backHref} print={false} />

      <div className="doc-body">
        <div className="sheet-area">
          {/* The grid stays mounted while comparing, so unsaved work survives. */}
          <div className="sheet-frame" hidden={Boolean(v.comparison)}>
            <SheetGrid
              key={loaded.round}
              initial={loaded.content}
              editable={canEdit}
              handle={handle}
              onEdit={() => {
                v.markDirty();
                const now = handle.read?.();
                if (now) setEdited({ round: loaded.round, cells: countCells(now) });
              }}
            />
          </div>

          {v.comparison && (
            <div className="doc-scroll">
              <div className="doc-page doc-compare">
                <CompareHead v={v} summary={changes ? sheetDiffSummary(changes) : null} />
                {!changes && <p className="muted">Comparing…</p>}
                {changes && changes.length > 0 && (
                  <div className="table-wrap">
                    <table className="sheet-diff">
                      <thead>
                        <tr><th>Sheet</th><th>Cell</th><th>Before</th><th>After</th></tr>
                      </thead>
                      <tbody>
                        {changes.map((c, i) =>
                          "cell" in c ? (
                            <tr key={i} className={`sheet-diff-${c.kind}`}>
                              <td>{c.sheet}</td>
                              <td className="mono">{c.cell}</td>
                              <td>{c.before ? <del>{c.before}</del> : <span className="muted">empty</span>}</td>
                              <td>{c.after ? <ins>{c.after}</ins> : <span className="muted">empty</span>}</td>
                            </tr>
                          ) : (
                            <tr key={i} className={c.kind === "sheet-added" ? "sheet-diff-added" : "sheet-diff-removed"}>
                              <td>{c.sheet}</td>
                              <td colSpan={3}>{c.kind === "sheet-added" ? <ins>Sheet added</ins> : <del>Sheet removed</del>}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="hint" style={{ marginTop: 20 }}>
                  Comparison lists every cell whose value or formula changed, including cells that changed because a formula recalculated. Formatting-only changes aren&apos;t listed.
                </p>
              </div>
            </div>
          )}
        </div>
        <HistoryPanel v={v} />
      </div>

      <footer className="doc-foot">{cells.toLocaleString()} {cells === 1 ? "cell" : "cells"} with content</footer>
    </div>
  );
}
