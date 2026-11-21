/**
 * Working with a document's content outside the editor: turning it into
 * plain text, and comparing two versions. Pure functions, tested by
 * scripts/test-doc-content.ts.
 *
 * Content is the word processor's structured format (a tree of nodes), not
 * HTML, so it can't carry scripts and is only ever drawn by the editor.
 */
import { diffArrays, diffWordsWithSpace } from "diff";

export interface DocNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: DocNode[];
}
export interface DocContent extends DocNode {
  type: "doc";
}

/** The largest document we'll store, measured as saved text (about 1.5 MB). */
export const MAX_CONTENT_CHARS = 1_500_000;

export const emptyDoc = (): DocContent => ({ type: "doc", content: [{ type: "paragraph" }] });

/** Plain text (from documents written before the word processor) as paragraphs. */
export function textToDoc(text: string): DocContent {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  return {
    type: "doc",
    content: lines.map((line) => (line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" })),
  };
}

/** A light shape check on content arriving from the browser. */
export function isDocContent(value: unknown, depth = 0): value is DocContent {
  if (depth === 0) {
    if (!value || typeof value !== "object" || (value as DocNode).type !== "doc") return false;
  }
  if (depth > 40 || !value || typeof value !== "object") return false;
  const node = value as DocNode;
  if (typeof node.type !== "string") return false;
  if (node.text !== undefined && typeof node.text !== "string") return false;
  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) return false;
    return node.content.every((child) => isDocContent(child, depth + 1));
  }
  return true;
}

const inlineText = (node: DocNode): string => {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  if (node.type === "image") return "[image]";
  return (node.content ?? []).map(inlineText).join("");
};

/**
 * The document as a list of text blocks, one per paragraph, heading, list
 * item, table row, and so on. This is what versions are compared by.
 */
export function docToBlocks(doc: DocNode | null | undefined): string[] {
  const blocks: string[] = [];
  const walk = (node: DocNode, prefix: string) => {
    switch (node.type) {
      case "paragraph":
      case "heading":
      case "codeBlock": {
        const text = inlineText(node);
        if (text.trim() || prefix) blocks.push(prefix + text);
        return;
      }
      case "image":
        blocks.push(`${prefix}[image]`);
        return;
      case "horizontalRule":
        blocks.push("———");
        return;
      case "bulletList":
        (node.content ?? []).forEach((item) => walk(item, "• "));
        return;
      case "orderedList":
        (node.content ?? []).forEach((item, i) => walk(item, `${i + 1}. `));
        return;
      case "taskList":
        (node.content ?? []).forEach((item) => walk(item, item.attrs?.checked ? "[x] " : "[ ] "));
        return;
      case "tableRow": {
        const cells = (node.content ?? []).map((cell) => (cell.content ?? []).map(inlineText).join(" ").trim());
        // An empty row has nothing to compare.
        if (cells.some(Boolean)) blocks.push(cells.join(" | "));
        return;
      }
      default: {
        // List items, block quotes, tables: the marker goes on the first block inside.
        (node.content ?? []).forEach((child, i) => walk(child, i === 0 ? prefix : prefix ? "   " : ""));
      }
    }
  };
  if (doc) walk(doc, "");
  return blocks;
}

export const docToText = (doc: DocNode | null | undefined) => docToBlocks(doc).join("\n");

/** Words in the document's own text (list markers and table separators don't count). */
export function countWords(doc: DocNode | null | undefined): number {
  let words = 0;
  const walk = (node: DocNode) => {
    if (node.content?.some((c) => c.type === "text")) {
      const text = inlineText(node).trim();
      if (text) words += text.split(/\s+/).length;
      return;
    }
    (node.content ?? []).forEach(walk);
  };
  if (doc) walk(doc);
  return words;
}

export type DiffPart = { text: string; kind: "same" | "added" | "removed" };
export type DiffBlock =
  | { kind: "same"; text: string }
  | { kind: "added"; text: string }
  | { kind: "removed"; text: string }
  | { kind: "changed"; parts: DiffPart[] };

/**
 * Compares two versions block by block. A block that was edited (rather than
 * added or removed whole) is marked "changed", with the exact words that
 * were added and removed.
 */
export function diffDocs(before: DocNode | null | undefined, after: DocNode | null | undefined): DiffBlock[] {
  const result: DiffBlock[] = [];
  const changes = diffArrays(docToBlocks(before), docToBlocks(after));
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const next = changes[i + 1];
    if (change.removed && next?.added) {
      // A run of removed blocks followed by added ones: pair them up as edits.
      const pairs = Math.min(change.value.length, next.value.length);
      for (let k = 0; k < pairs; k++) {
        const parts = diffWordsWithSpace(change.value[k], next.value[k]).map<DiffPart>((p) => ({
          text: p.value,
          kind: p.added ? "added" : p.removed ? "removed" : "same",
        }));
        // If almost nothing survived, it reads better as one block out, one block in.
        const kept = parts.filter((p) => p.kind === "same").reduce((n, p) => n + p.text.trim().length, 0);
        if (kept < 3) {
          result.push({ kind: "removed", text: change.value[k] }, { kind: "added", text: next.value[k] });
        } else {
          result.push({ kind: "changed", parts });
        }
      }
      change.value.slice(pairs).forEach((text) => result.push({ kind: "removed", text }));
      next.value.slice(pairs).forEach((text) => result.push({ kind: "added", text }));
      i++;
      continue;
    }
    const kind = change.added ? "added" : change.removed ? "removed" : "same";
    change.value.forEach((text) => result.push({ kind, text }));
  }
  return result;
}

export function diffSummary(blocks: DiffBlock[]): { added: number; removed: number; changed: number } {
  return {
    added: blocks.filter((b) => b.kind === "added").length,
    removed: blocks.filter((b) => b.kind === "removed").length,
    changed: blocks.filter((b) => b.kind === "changed").length,
  };
}

/**
 * Where a document is visible. A document saved in an integration also shows
 * in each sub-system that integration connects; a document saved in a
 * sub-system (or an integration) also shows in the project drive, which
 * holds everything.
 */
export function visibleInSubsystem(
  doc: { subsystem_id: string | null; integration_id: string | null },
  subsystemId: string,
  integrations: { id: string; subsystem_ids: string[] }[],
): boolean {
  if (doc.subsystem_id === subsystemId) return true;
  if (!doc.integration_id) return false;
  return Boolean(integrations.find((i) => i.id === doc.integration_id)?.subsystem_ids.includes(subsystemId));
}
