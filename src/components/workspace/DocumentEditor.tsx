"use client";

import { useMemo } from "react";
import { diffDocs, diffSummary, emptyDoc, textToDoc, type DocContent } from "@/lib/doc-content";
import type { DocFull, Draft, WorkspaceApi } from "@/lib/workspace-types";
import { EditorPage, Toolbar, WordCount, useRichEditor } from "./RichEditor";
import { CompareHead, HistoryPanel, VersionedHeader, useVersioned, type Drive } from "./Versioned";

/**
 * A written document open in the word processor. Autosave, versions,
 * history, and restore come from Versioned.tsx; this adds the editor and the
 * text comparison.
 */
export function DocumentEditor({
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
  const initial = useMemo<DocContent>(
    () => (draft?.content as DocContent | undefined) ?? (doc.content as DocContent | null) ?? (doc.body ? textToDoc(doc.body) : emptyDoc()),
    [draft, doc.content, doc.body],
  );

  // The editor and the versioning each need the other, so the change handler goes through this object.
  const hooks = useMemo(() => ({ onChange: () => {} }), []);
  const editor = useRichEditor({ content: initial, editable: canEdit, onChange: () => hooks.onChange() });

  const v = useVersioned<DocContent>({
    doc,
    draft,
    api,
    canEdit,
    /**
     * The editor's content as plain data. The editor builds some objects
     * without a prototype, which can't be sent to a server action as they
     * are, so they're copied through JSON first.
     */
    getContent: () => (editor ? (JSON.parse(JSON.stringify(editor.getJSON())) as DocContent) : null),
    applyContent: (content) => editor?.commands.setContent(content ?? emptyDoc(), { emitUpdate: false }),
  });
  hooks.onChange = v.markDirty;

  const diff = useMemo(() => (v.sides ? diffDocs(v.sides.before, v.sides.after) : null), [v.sides]);

  return (
    <div className={`doc${v.showHistory ? " has-history" : ""}`}>
      <VersionedHeader v={v} drives={drives} backHref={backHref} />
      {!v.comparison && editor && canEdit && <Toolbar editor={editor} />}

      <div className="doc-body">
        <div className="doc-scroll">
          {/* The editor stays mounted while comparing, so unsaved work and its undo history survive. */}
          <div hidden={Boolean(v.comparison)}>
            <EditorPage editor={editor} />
          </div>

          {v.comparison && (
            <div className="doc-page doc-compare">
              <CompareHead v={v} summary={diff ? diffSummary(diff) : null} />
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
        <HistoryPanel v={v} />
      </div>

      <footer className="doc-foot">{editor && <WordCount editor={editor} />}</footer>
    </div>
  );
}
