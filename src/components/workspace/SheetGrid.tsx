"use client";

import { useEffect, useRef } from "react";
import { Workbook, type WorkbookInstance } from "@fortune-sheet/react";
import type { Sheet } from "@fortune-sheet/core";
import "@fortune-sheet/react/dist/index.css";
import { compactSheets, type SheetContent } from "@/lib/sheet-content";

/** How SheetEditor reads the grid: filled in by SheetGrid once it's on screen. */
export interface GridHandle {
  read: (() => SheetContent) | null;
}

/**
 * The spreadsheet grid itself (FortuneSheet): cells, formulas, formatting,
 * multiple sheets, and its own toolbar. Loaded in the browser only.
 *
 * The grid reports a change for all sorts of things (moving the selection,
 * its own start-up), so `onEdit` is only called once the person has actually
 * touched it and the saved content is different from before.
 */
export default function SheetGrid({
  initial,
  editable,
  handle,
  onEdit,
}: {
  initial: SheetContent;
  editable: boolean;
  handle: GridHandle;
  onEdit: () => void;
}) {
  const ref = useRef<WorkbookInstance>(null);
  const touched = useRef(false);
  const last = useRef<string | null>(null);

  useEffect(() => {
    handle.read = () => JSON.parse(JSON.stringify(compactSheets(ref.current?.getAllSheets() ?? initial))) as SheetContent;
    return () => {
      handle.read = null;
    };
  }, [handle, initial]);

  /** On the first touch, remember what the content looked like before it. */
  const touch = () => {
    if (touched.current) return;
    touched.current = true;
    last.current = JSON.stringify(compactSheets(ref.current?.getAllSheets() ?? initial));
  };

  /**
   * Tab while typing in a cell should finish the cell and move one to the
   * right (Shift+Tab: left), as in any spreadsheet. The grid library ignores
   * Tab while a cell is being edited, so this replays it as the keys the
   * library does understand.
   */
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    touch();
    const target = e.target as HTMLElement;
    if (e.key !== "Tab" || e.nativeEvent.isComposing) return;
    if (!target.classList?.contains("luckysheet-cell-input") || !target.innerText.trim()) return;
    e.preventDefault();
    e.stopPropagation();
    const press = (key: string, keyCode: number) =>
      (document.activeElement ?? target).dispatchEvent(new KeyboardEvent("keydown", { key, code: key, keyCode, bubbles: true, cancelable: true }));
    const sideways = e.shiftKey ? (["ArrowLeft", 37] as const) : (["ArrowRight", 39] as const);
    // Enter finishes the cell and moves down; then step back up and across. Each
    // step waits for the grid to settle on the one before.
    press("Enter", 13);
    window.setTimeout(() => {
      press("ArrowUp", 38);
      window.setTimeout(() => press(sideways[0], sideways[1]), 30);
    }, 30);
  };

  return (
    <div className="sheet-grid" onPointerDownCapture={touch} onKeyDownCapture={onKeyDown} onPasteCapture={touch}>
      <Workbook
        ref={ref}
        // Our stored shape is the grid's own, typed a little more loosely.
        data={initial as unknown as Sheet[]}
        allowEdit={editable}
        lang="en"
        currency="$"
        onChange={(data) => {
          if (!touched.current) return;
          const now = JSON.stringify(compactSheets(data));
          if (now === last.current) return;
          last.current = now;
          onEdit();
        }}
      />
    </div>
  );
}
