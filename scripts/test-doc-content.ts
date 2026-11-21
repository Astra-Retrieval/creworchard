/**
 * Checks document text extraction, version comparison, and drive visibility.
 * Run with:  node --experimental-strip-types scripts/test-doc-content.ts
 */
import assert from "node:assert/strict";
import { countWords, diffDocs, diffSummary, docToBlocks, isDocContent, textToDoc, visibleInSubsystem, type DocNode } from "../src/lib/doc-content.ts";

import { cellName, columnName, compactSheets, countCells, diffSheets, isSheetContent, sheetDiffSummary, type SheetContent } from "../src/lib/sheet-content.ts";

const sheetA: SheetContent = [{ name: "Budget", id: "s1", celldata: [
  { r: 0, c: 0, v: { v: "Item", m: "Item" } }, { r: 1, c: 0, v: { v: "Valve", m: "Valve" } }, { r: 1, c: 1, v: { v: 40, m: "40" } },
  { r: 2, c: 1, v: { v: 40, m: "40", f: "=SUM(B2:B2)" } }, { r: 3, c: 0, v: { v: "Old note", m: "Old note" } },
] }];
const sheetB: SheetContent = [
  { name: "Budget 2027", id: "s1", celldata: [
    { r: 0, c: 0, v: { v: "Item", m: "Item" } }, { r: 1, c: 0, v: { v: "Valve", m: "Valve" } }, { r: 1, c: 1, v: { v: 60, m: "60" } },
    { r: 2, c: 1, v: { v: 60, m: "60", f: "=SUM(B2:B2)" } }, { r: 1, c: 2, v: { v: "each", m: "each" } },
  ] },
  { name: "Notes", id: "s2", celldata: [{ r: 0, c: 0, v: { v: "hi", m: "hi" } }] },
];
const sheetDiff = diffSheets(sheetA, sheetB);
const matrix = [{ name: "S", id: "x", luckysheet_select_save: [{}], data: [[{ v: 1, m: "1" }, null], [null, {}], [null, { v: "b", m: "b" }]] }];

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
  // Spreadsheets.
  ["column letters", [columnName(0), columnName(25), columnName(26), columnName(701), columnName(702)], ["A", "Z", "AA", "ZZ", "AAA"]],
  ["cell names", cellName(2, 1), "B3"],
  ["the grid's matrix is trimmed to the cells that hold something", compactSheets(matrix)[0].celldata, [{ r: 0, c: 0, v: { v: 1, m: "1" } }, { r: 2, c: 1, v: { v: "b", m: "b" } }]],
  ["view state is dropped when saving", "luckysheet_select_save" in compactSheets(matrix)[0], false],
  ["cells with content are counted", countCells(sheetA), 5],
  ["a changed value", sheetDiff.find((c) => "cell" in c && c.cell === "B2"), { kind: "changed", sheet: "Budget 2027", cell: "B2", r: 1, c: 1, before: "40", after: "60" }],
  ["a formula's new result is reported with the formula", sheetDiff.find((c) => "cell" in c && c.cell === "B3"), { kind: "changed", sheet: "Budget 2027", cell: "B3", r: 2, c: 1, before: "40  (=SUM(B2:B2))", after: "60  (=SUM(B2:B2))" }],
  ["a new cell", sheetDiff.find((c) => "cell" in c && c.cell === "C2")?.kind, "added"],
  ["a cleared cell", sheetDiff.find((c) => "cell" in c && c.cell === "A4")?.kind, "removed"],
  ["a renamed sheet is still compared cell by cell, and a new sheet is reported", sheetDiffSummary(sheetDiff), { added: 3, removed: 1, changed: 2 }],
  ["a deleted sheet is reported", diffSheets(sheetB, sheetA).some((c) => c.kind === "sheet-removed" && c.sheet === "Notes"), true],
  ["identical spreadsheets have no changes", diffSheets(sheetA, sheetA), []],
  ["valid spreadsheet accepted", isSheetContent(sheetB), true],
  ["a written document is not a spreadsheet", isSheetContent({ type: "doc" }), false],
  ["bad cell positions rejected", isSheetContent([{ name: "S", celldata: [{ r: -1, c: 0, v: null }] }]), false],
];

for (const [name, got, expected] of checks) {
  assert.deepEqual(got, expected, name);
  console.log(`  ok  ${name}`);
}
console.log(`\n${checks.length}/${checks.length} document cases pass`);
