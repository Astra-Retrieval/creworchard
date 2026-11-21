/**
 * Geometry for the project canvas: where boxes sit and how lines are drawn.
 * Pure functions, tested by scripts/test-org-rules.ts.
 */

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 92;
const COLUMN_STEP = 340;
const ROW_STEP = 210;

export interface Point { x: number; y: number }
export interface Box extends Point { id: string }

/**
 * Where a new sub-system lands: left to right, four to a row, in the order
 * they were created. The position is saved with the sub-system.
 */
export function nextNodePosition(existingCount: number): Point {
  const col = existingCount % 4;
  const row = Math.floor(existingCount / 4);
  return { x: 96 + col * COLUMN_STEP, y: 120 + row * ROW_STEP };
}

export const centerOf = (box: Point): Point => ({ x: box.x + NODE_WIDTH / 2, y: box.y + NODE_HEIGHT / 2 });

/**
 * Where each integration's box sits: the middle of the sub-systems it
 * connects. If that spot is on top of a sub-system, or already taken by
 * another integration, it moves down into the gap between rows.
 */
export function placeIntegrations(
  integrations: { id: string; subsystem_ids: string[] }[],
  nodes: Box[],
): Map<string, Point> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const placed: Point[] = [];
  const result = new Map<string, Point>();
  const hitsNode = (p: Point) =>
    nodes.some((n) => p.x > n.x - 60 && p.x < n.x + NODE_WIDTH + 60 && p.y > n.y - 22 && p.y < n.y + NODE_HEIGHT + 22);
  const hitsPlaced = (p: Point) => placed.some((q) => Math.abs(q.x - p.x) < 120 && Math.abs(q.y - p.y) < 36);

  for (const integration of integrations) {
    const ends = integration.subsystem_ids.map((id) => byId.get(id)).filter((n): n is Box => Boolean(n)).map(centerOf);
    if (ends.length === 0) continue;
    const point = {
      x: Math.round(ends.reduce((sum, p) => sum + p.x, 0) / ends.length),
      y: Math.round(ends.reduce((sum, p) => sum + p.y, 0) / ends.length),
    };
    if (hitsNode(point)) point.y += ROW_STEP / 2;
    for (let tries = 0; tries < 12 && hitsPlaced(point); tries++) point.y += 40;
    placed.push({ ...point });
    result.set(integration.id, point);
  }
  return result;
}

export type LineStyle = "square" | "curved";
export function isLineStyle(value: unknown): value is LineStyle {
  return value === "square" || value === "curved";
}

/**
 * The SVG path from one point to another.
 *   square  horizontal and vertical segments only, with one 90° corner pair
 *   curved  a smooth S-curve
 * Both leave along whichever axis the two points are further apart on.
 */
export function connectorPath(from: Point, to: Point, style: LineStyle): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  if (style === "square") {
    if (dx === 0 || dy === 0) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    return horizontal
      ? `M ${from.x} ${from.y} H ${from.x + dx / 2} V ${to.y} H ${to.x}`
      : `M ${from.x} ${from.y} V ${from.y + dy / 2} H ${to.x} V ${to.y}`;
  }
  return horizontal
    ? `M ${from.x} ${from.y} C ${from.x + dx / 2} ${from.y}, ${to.x - dx / 2} ${to.y}, ${to.x} ${to.y}`
    : `M ${from.x} ${from.y} C ${from.x} ${from.y + dy / 2}, ${to.x} ${to.y - dy / 2}, ${to.x} ${to.y}`;
}
