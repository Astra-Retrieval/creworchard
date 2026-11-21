"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NODE_HEIGHT, NODE_WIDTH, centerOf, connectorPath, isLineStyle, placeIntegrations, type LineStyle } from "@/lib/canvas-layout";
import type { Abilities, DocSummary, IntegrationNode, Person, Pin, SubsystemNode, WorkspaceApi } from "@/lib/workspace-types";
import { CreateButton } from "./CreateButton";
import { SelectionPanel, type Selection } from "./SelectionPanel";

const LINE_STYLE_KEY = "crew-orchard.line-style";
/** How far the pointer must travel before a press counts as a drag, not a click. */
const DRAG_THRESHOLD = 4;

/**
 * A project's main page. Sub-systems are colored boxes, integrations are
 * grey boxes joined to their sub-systems by grey lines. Drag anywhere to
 * move around; press a box to light it up and open its panel on the right.
 */
export function Canvas({
  subsystems,
  integrations,
  people,
  documents,
  pins,
  abilities,
  api,
  documentsHref,
}: {
  subsystems: SubsystemNode[];
  integrations: IntegrationNode[];
  people: Person[];
  documents: DocSummary[];
  pins: Pin[];
  abilities: Abilities;
  api: WorkspaceApi;
  /** The Documents tab's address, for opening documents in the word processor. */
  documentsHref: string;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lineStyle, setLineStyle] = useState<LineStyle>("square");
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // Remember the line style on this device.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LINE_STYLE_KEY);
      if (isLineStyle(saved)) setLineStyle(saved);
    } catch {
      // Storage can be unavailable (private windows); the default is fine.
    }
  }, []);
  const chooseLineStyle = (style: LineStyle) => {
    setLineStyle(style);
    try {
      window.localStorage.setItem(LINE_STYLE_KEY, style);
    } catch {
      // Not remembered, but it still applies for this visit.
    }
  };

  const spots = useMemo(() => placeIntegrations(integrations, subsystems), [integrations, subsystems]);
  const subsystemById = useMemo(() => new Map(subsystems.map((s) => [s.id, s])), [subsystems]);

  // If the selected thing disappears (someone else removed it), close its panel.
  const selectedSubsystem = selection?.kind === "subsystem" ? subsystemById.get(selection.id) ?? null : null;
  const selectedIntegration = selection?.kind === "integration" ? integrations.find((i) => i.id === selection.id) ?? null : null;

  /** A sub-system is lit when it's selected, or attached to the selected integration. */
  const isLit = (s: SubsystemNode) => selectedSubsystem?.id === s.id || Boolean(selectedIntegration?.subsystem_ids.includes(s.id));
  /** An integration box is blue when it's selected, or comes off the selected sub-system. */
  const isBlue = (i: IntegrationNode) => selectedIntegration?.id === i.id || Boolean(selectedSubsystem && i.subsystem_ids.includes(selectedSubsystem.id));
  /** A line is blue when its integration is selected, or it's the line off the selected sub-system. */
  const lineIsBlue = (i: IntegrationNode, subsystemId: string) => selectedIntegration?.id === i.id || selectedSubsystem?.id === subsystemId;

  const select = (next: Selection) => {
    if (suppressClick.current) return;
    setSelection((current) => (current?.kind === next.kind && current.id === next.id ? null : next));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    suppressClick.current = false;
    drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.moved = true;
      suppressClick.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setPan({ x: d.panX + dx, y: d.panY + dy });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    // A plain click on empty canvas clears the selection.
    if (!d.moved && !(e.target as HTMLElement).closest("button")) setSelection(null);
    // Let the click that follows a drag pass, then accept clicks again.
    if (d.moved) window.setTimeout(() => (suppressClick.current = false), 0);
  };

  /** Arrow keys move around too, for people not using a pointer. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = e.shiftKey ? 240 : 60;
    const move: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const delta = move[e.key];
    if (!delta) return;
    e.preventDefault();
    setPan((p) => ({ x: p.x + delta[0], y: p.y + delta[1] }));
  };

  const panelOpen = Boolean(selectedSubsystem || selectedIntegration);
  const create = abilities.createStructure ? <CreateButton subsystems={subsystems} people={people} api={api} /> : null;

  return (
    <div className={`ws-canvas${panelOpen ? " has-panel" : ""}`}>
      <div
        className={`ws-viewport${dragging ? " is-dragging" : ""}`}
        style={{ backgroundPosition: `${pan.x}px ${pan.y}px` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="group"
        aria-label="Project canvas. Drag, or use the arrow keys, to move around."
      >
        <div className="ws-surface" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
          <svg className="ws-edges" width="1" height="1" aria-hidden="true">
            {/* Grey lines first, blue ones after, so highlighted lines sit on top. */}
            {[false, true].map((blue) =>
              integrations.flatMap((integration) => {
                const spot = spots.get(integration.id);
                if (!spot) return [];
                return integration.subsystem_ids.map((subsystemId) => {
                  const node = subsystemById.get(subsystemId);
                  if (!node || lineIsBlue(integration, subsystemId) !== blue) return null;
                  return (
                    <path
                      key={`${integration.id}-${subsystemId}`}
                      d={connectorPath(centerOf(node), spot, lineStyle)}
                      className={blue ? "is-blue" : undefined}
                    />
                  );
                });
              }),
            )}
          </svg>

          {subsystems.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`ws-node ws-color-${s.color}${isLit(s) ? " is-lit" : ""}`}
              style={{ left: s.x, top: s.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
              aria-pressed={selectedSubsystem?.id === s.id}
              onClick={() => select({ kind: "subsystem", id: s.id })}
            >
              <span className="ws-node-name">{s.name}</span>
              {s.note && <span className="ws-node-note">{s.note}</span>}
            </button>
          ))}

          {integrations.map((i) => {
            const spot = spots.get(i.id);
            if (!spot) return null;
            return (
              <button
                key={i.id}
                type="button"
                className={`ws-link${isBlue(i) ? " is-blue" : ""}`}
                style={{ left: spot.x, top: spot.y }}
                aria-pressed={selectedIntegration?.id === i.id}
                aria-label={`Integration: ${i.name}`}
                title={i.name}
                onClick={() => select({ kind: "integration", id: i.id })}
              >
                {i.name}
              </button>
            );
          })}
        </div>
      </div>

      {subsystems.length === 0 && (
        <p className="ws-canvas-empty">
          Blank canvas.{" "}
          {abilities.createStructure ? <>Use <strong>New</strong> to add your first sub&#8209;system.</> : "Sub-systems will appear here once the project lead adds them."}
        </p>
      )}

      <div className="ws-corner ws-corner-top-left">
        <div className="ws-toggle" role="group" aria-label="Connection line style">
          <button type="button" aria-pressed={lineStyle === "square"} onClick={() => chooseLineStyle("square")} title="Square lines">
            <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true"><path d="M1 12H11V2H21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>
            <span className="sr-only">Square lines</span>
          </button>
          <button type="button" aria-pressed={lineStyle === "curved"} onClick={() => chooseLineStyle("curved")} title="Curved lines">
            <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true"><path d="M1 12C11 12 11 2 21 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <span className="sr-only">Curved lines</span>
          </button>
        </div>
      </div>
      <div className="ws-corner ws-corner-top-right">{create}</div>
      <div className="ws-corner ws-corner-bottom-left">{create}</div>

      {(selectedSubsystem || selectedIntegration) && (
        <SelectionPanel
          // A fresh panel for each thing, so one box's open section doesn't carry to the next.
          key={selection!.id}
          subsystem={selectedSubsystem}
          integration={selectedIntegration}
          subsystems={subsystems}
          integrations={integrations}
          documentsHref={documentsHref}
          people={people}
          documents={documents}
          pins={pins}
          abilities={abilities}
          api={api}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
