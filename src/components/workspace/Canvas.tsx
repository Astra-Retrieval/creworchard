import { NODE_HEIGHT, NODE_WIDTH } from "@/lib/org-rules";
import type { FormState } from "@/app/waitlist/actions";
import { CreateButton } from "./CreateButton";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

interface Node { id: string; name: string; x: number; y: number }
interface Edge { id: string; source_id: string; target_id: string; name: string | null }

/**
 * A project's main page: a canvas that starts blank. Sub-systems appear as
 * boxes at their saved positions, and integrations as lines between them.
 * The same "New" button sits top right and bottom left.
 */
export function Canvas({
  subsystems,
  integrations,
  createSubsystem,
  createIntegration,
}: {
  subsystems: Node[];
  integrations: Edge[];
  createSubsystem: Action;
  createIntegration: Action;
}) {
  const byId = new Map(subsystems.map((s) => [s.id, s]));
  const center = (n: Node) => ({ x: n.x + NODE_WIDTH / 2, y: n.y + NODE_HEIGHT / 2 });
  // The surface grows to fit everything, with room to spare past the last box.
  const width = Math.max(0, ...subsystems.map((s) => s.x + NODE_WIDTH)) + 160;
  const height = Math.max(0, ...subsystems.map((s) => s.y + NODE_HEIGHT)) + 200;
  const options = subsystems.map(({ id, name }) => ({ id, name }));
  const create = <CreateButton subsystems={options} createSubsystem={createSubsystem} createIntegration={createIntegration} />;

  return (
    <div className="ws-canvas">
      <div className="ws-canvas-scroll">
        <div className="ws-canvas-surface" style={{ minWidth: width, minHeight: height }}>
          <svg className="ws-edges" width={width} height={height} aria-hidden="true">
            {integrations.map((edge) => {
              const from = byId.get(edge.source_id);
              const to = byId.get(edge.target_id);
              if (!from || !to) return null;
              const a = center(from);
              const b = center(to);
              return <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
            })}
          </svg>

          {/* Integration names sit on the middle of their line. */}
          {integrations.map((edge) => {
            const from = byId.get(edge.source_id);
            const to = byId.get(edge.target_id);
            if (!from || !to || !edge.name) return null;
            const a = center(from);
            const b = center(to);
            return (
              <span key={edge.id} className="ws-edge-label" title={edge.name} style={{ left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 }}>
                {edge.name}
              </span>
            );
          })}

          <ul className="ws-nodes" aria-label="Sub-systems">
            {subsystems.map((s) => (
              <li key={s.id} className="ws-node" style={{ left: s.x, top: s.y, width: NODE_WIDTH, height: NODE_HEIGHT }}>
                <span className="ws-node-kind">Sub-system</span>
                <span className="ws-node-name">{s.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {integrations.length > 0 && (
        <ul className="sr-only" aria-label="Integrations">
          {integrations.map((edge) => (
            <li key={edge.id}>
              {byId.get(edge.source_id)?.name} to {byId.get(edge.target_id)?.name}
              {edge.name ? `: ${edge.name}` : ""}
            </li>
          ))}
        </ul>
      )}

      {subsystems.length === 0 && (
        <p className="ws-canvas-empty">Blank canvas. Use <strong>New</strong> to add your first sub-system.</p>
      )}

      <div className="ws-corner ws-corner-top-right">{create}</div>
      <div className="ws-corner ws-corner-bottom-left">{create}</div>
    </div>
  );
}
