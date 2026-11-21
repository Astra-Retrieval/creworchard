/**
 * Checks document text extraction, version comparison, and drive visibility.
 * Run with:  node --experimental-strip-types scripts/test-doc-content.ts
 */
import assert from "node:assert/strict";
import { countWords, diffDocs, diffSummary, docToBlocks, isDocContent, textToDoc, visibleInSubsystem, type DocNode } from "../src/lib/doc-content.ts";

const p = (text: string): DocNode => ({ type: "paragraph", content: [{ type: "text", text }] });
const doc = (...content: DocNode[]): DocNode => ({ type: "doc", content });
const li = (text: string, attrs?: Record<string, unknown>): DocNode => ({ type: attrs ? "taskItem" : "listItem", attrs, content: [p(text)] });

const rich = doc(
  { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Test plan" }] },
  { type: "paragraph", content: [{ type: "text", text: "Bold", marks: [{ type: "bold" }] }, { type: "text", text: " and plain" }] },
  { type: "bulletList", content: [li("Cold flow"), li("Hot fire")] },
  { type: "orderedList", content: [li("First"), li("Second")] },
  { type: "taskList", content: [li("Done", { checked: true }), li("Open", { checked: false })] },
  { type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", content: [p("Part")] }, { type: "tableHeader", content: [p("Qty")] }] }] },
  { type: "horizontalRule" },
);

const v1 = doc(p("Thrust is 40 mN."), p("Tank holds 80 kg of xenon."), p("Old section."));
const v2 = doc(p("Thrust is 60 mN."), p("Tank holds 80 kg of xenon."), p("A brand new paragraph."));
const d = diffDocs(v1, v2);
const integrations = [{ id: "i1", subsystem_ids: ["a", "b"] }];

const checks: [string, unknown, unknown][] = [
  ["rich content becomes one line per block", docToBlocks(rich), ["Test plan", "Bold and plain", "• Cold flow", "• Hot fire", "1. First", "2. Second", "[x] Done", "[ ] Open", "Part | Qty", "———"]],
  ["word count", countWords(rich), 15],
  ["plain text becomes paragraphs", docToBlocks(textToDoc("one\n\ntwo")), ["one", "two"]],
  ["identical versions show no changes", diffSummary(diffDocs(v1, v1)), { added: 0, removed: 0, changed: 0 }],
  ["an edited paragraph is marked changed, with the words", d[0], { kind: "changed", parts: [{ text: "Thrust is ", kind: "same" }, { text: "40", kind: "removed" }, { text: "60", kind: "added" }, { text: " mN.", kind: "same" }] }],
  ["an untouched paragraph is the same", d[1], { kind: "same", text: "Tank holds 80 kg of xenon." }],
  ["a rewritten paragraph is one out, one in", d.slice(2), [{ kind: "removed", text: "Old section." }, { kind: "added", text: "A brand new paragraph." }]],
  ["an added paragraph", diffSummary(diffDocs(v1, doc(...(v1.content ?? []), p("More.")))), { added: 1, removed: 0, changed: 0 }],
  ["a first version compares against nothing", diffSummary(diffDocs(null, v1)), { added: 3, removed: 0, changed: 0 }],
  ["valid content accepted", isDocContent(rich), true],
  ["non-document rejected", isDocContent({ type: "paragraph" }), false],
  ["malformed node rejected", isDocContent({ type: "doc", content: [{ text: 5 }] }), false],
  ["junk rejected", isDocContent("<script>"), false],
  ["a sub-system's own document shows in it", visibleInSubsystem({ subsystem_id: "a", integration_id: null }, "a", integrations), true],
  ["an integration's document shows in each connected sub-system", visibleInSubsystem({ subsystem_id: null, integration_id: "i1" }, "b", integrations), true],
  ["but not in an unconnected sub-system", visibleInSubsystem({ subsystem_id: null, integration_id: "i1" }, "c", integrations), false],
  ["another sub-system's document doesn't show", visibleInSubsystem({ subsystem_id: "b", integration_id: null }, "a", integrations), false],
  ["a project-only document doesn't show in a sub-system", visibleInSubsystem({ subsystem_id: null, integration_id: null }, "a", integrations), false],
];

for (const [name, got, expected] of checks) {
  assert.deepEqual(got, expected, name);
  console.log(`  ok  ${name}`);
}
console.log(`\n${checks.length}/${checks.length} document cases pass`);
