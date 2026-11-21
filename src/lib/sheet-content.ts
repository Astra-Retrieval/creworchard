/**
 * Working with a spreadsheet's content outside the grid: trimming it for
 * storage, checking its shape, and comparing two versions cell by cell.
 * Pure functions, tested by scripts/test-doc-content.ts.
 *
 * The format is the grid library's own (FortuneSheet): a list of sheets,
 * each with a sparse list of cells.
 */

export interface SheetCellValue {
  /** The raw value. */
  v?: string | number | boolean | null;
  /** The value as displayed (formatted). */
  m?: string | number | null;
  /** The formula, including its leading "=". */
  f?: string | null;
  [key: string]: unknown;
}
export interface SheetCell {
  r: number;
  c: number;
  v: SheetCellValue | null;
}
export interface SheetData {
  name: string;
  id?: string;
  order?: number;
  celldata: SheetCell[];
  [key: string]: unknown;
}
export type SheetContent = SheetData[];

/** A new spreadsheet: one empty sheet. */
export const emptySheets = (): SheetContent => [{ name: "Sheet1", id: "sheet-1", order: 0, status: 1, row: 60, column: 26, celldata: [] }];

/** What we keep of each sheet when saving. Everything else is view state (selection, scroll position). */
const KEPT = [
  "name", "id", "order", "color", "hide", "row", "column", "config", "zoomRatio", "defaultRowHeight", "defaultColWidth",
  "showGridLines", "frozen", "calcChain", "filter", "filter_select", "dataVerification", "luckysheet_conditionformat_save",
  "luckysheet_alternateformat_save", "hyperlink", "images",
] as const;

const isBlank = (cell: unknown) =>
  cell === null || cell === undefined || (typeof cell === "object" && Object.keys(cell as object).length === 0);

/**
 * The grid hands back each sheet as a full rows-by-columns matrix, mostly
 * empty. This keeps only the cells that hold something, and drops view state.
 */
export function compactSheets(sheets: unknown): SheetContent {
  if (!Array.isArray(sheets)) return emptySheets();
  return sheets.map((raw, index) => {
    const sheet = (raw ?? {}) as Record<string, unknown>;
    const out: SheetData = { name: String(sheet.name ?? `Sheet${index + 1}`), celldata: [] };
    for (const key of KEPT) if (sheet[key] !== undefined && sheet[key] !== null) (out as Record<string, unknown>)[key] = sheet[key];
    out.status = index === 0 ? 1 : 0; // open on the first sheet
    const matrix = sheet.data;
    if (Array.isArray(matrix)) {
      matrix.forEach((row, r) => {
        if (!Array.isArray(row)) return;
        row.forEach((cell, c) => {
          if (!isBlank(cell)) out.celldata.push({ r, c, v: cell as SheetCellValue });
        });
      });
    } else if (Array.isArray(sheet.celldata)) {
      out.celldata = (sheet.celldata as SheetCell[]).filter((cell) => cell && !isBlank(cell.v));
    }
    return out;
  });
}

/** A light shape check on content arriving from the browser. */
export function isSheetContent(value: unknown): value is SheetContent {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return false;
  return value.every((sheet) => {
    if (!sheet || typeof sheet !== "object" || Array.isArray(sheet)) return false;
    const s = sheet as SheetData;
    if (typeof s.name !== "string" || !Array.isArray(s.celldata)) return false;
    return s.celldata.every(
      (cell) => cell && typeof cell === "object" && Number.isInteger(cell.r) && Number.isInteger(cell.c) && cell.r >= 0 && cell.c >= 0,
    );
  });
}

/** Column letters: 0 → A, 25 → Z, 26 → AA. */
export function columnName(c: number): string {
  let name = "";
  for (let n = c; n >= 0; n = Math.floor(n / 26) - 1) name = String.fromCharCode(65 + (n % 26)) + name;
  return name;
}
export const cellName = (r: number, c: number) => `${columnName(c)}${r + 1}`;

/** What a cell shows, and the formula behind it if there is one. */
export function cellText(cell: SheetCellValue | null | undefined): string {
  if (!cell) return "";
  const shown = cell.m ?? cell.v;
  const value = shown === null || shown === undefined ? "" : String(shown);
  if (cell.f) return value === "" ? cell.f : `${value}  (${cell.f})`;
  return value;
}

export const sheetsToText = (sheets: SheetContent | null | undefined) =>
  (sheets ?? []).map((s) => `${s.name}\n${s.celldata.map((cell) => cellText(cell.v)).filter(Boolean).join(" · ")}`).join("\n\n");

export const countCells = (sheets: SheetContent | null | undefined) =>
  (sheets ?? []).reduce((n, s) => n + s.celldata.filter((cell) => cellText(cell.v) !== "").length, 0);

export type SheetChange =
  | { kind: "sheet-added" | "sheet-removed"; sheet: string }
  | { kind: "added" | "removed" | "changed"; sheet: string; cell: string; r: number; c: number; before: string; after: string };

/**
 * Compares two versions of a spreadsheet: sheets added or removed, and every
 * cell whose value or formula differs. Sheets are matched by their id, so a
 * renamed sheet is still compared cell by cell.
 */
export function diffSheets(before: SheetContent | null | undefined, after: SheetContent | null | undefined): SheetChange[] {
  const changes: SheetChange[] = [];
  const key = (s: SheetData) => s.id ?? s.name;
  const old = new Map((before ?? []).map((s) => [key(s), s]));
  const seen = new Set<string>();

  for (const sheet of after ?? []) {
    const previous = old.get(key(sheet));
    seen.add(key(sheet));
    // A brand-new empty sheet is still worth reporting; its cells follow as "added".
    if (!previous) changes.push({ kind: "sheet-added", sheet: sheet.name });
    const was = new Map((previous?.celldata ?? []).map((cell) => [`${cell.r}:${cell.c}`, cellText(cell.v)]));
    const now = new Map(sheet.celldata.map((cell) => [`${cell.r}:${cell.c}`, cellText(cell.v)]));
    const cells = [...new Set([...was.keys(), ...now.keys()])]
      .map((k) => k.split(":").map(Number) as [number, number])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (const [r, c] of cells) {
      const a = was.get(`${r}:${c}`) ?? "";
      const b = now.get(`${r}:${c}`) ?? "";
      if (a === b) continue;
      changes.push({ kind: a === "" ? "added" : b === "" ? "removed" : "changed", sheet: sheet.name, cell: cellName(r, c), r, c, before: a, after: b });
    }
  }
  for (const sheet of before ?? []) if (!seen.has(key(sheet))) changes.push({ kind: "sheet-removed", sheet: sheet.name });
  return changes;
}

export function sheetDiffSummary(changes: SheetChange[]): { added: number; removed: number; changed: number } {
  return {
    added: changes.filter((c) => c.kind === "added" || c.kind === "sheet-added").length,
    removed: changes.filter((c) => c.kind === "removed" || c.kind === "sheet-removed").length,
    changed: changes.filter((c) => c.kind === "changed").length,
  };
}
