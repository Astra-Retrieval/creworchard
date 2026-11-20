/**
 * The pure rules for organizations and projects, with no database or framework
 * imports so they can be tested on their own (scripts/test-org-rules.ts).
 * src/lib/orgs.ts wraps them with the database.
 *
 *   Organization admins  have every permission, always
 *   Members              have only the permissions an admin has granted them
 *   Everyone else        has none
 */

export type OrgRole = "admin" | "member";

/**
 * Every permission an organization admin can grant to a member. To add one,
 * add it here: the members table on the organization dashboard picks it up.
 */
export const ORG_PERMISSIONS = [
  { key: "projects.create", label: "Create projects" },
] as const;

export type OrgPermission = (typeof ORG_PERMISSIONS)[number]["key"];
const PERMISSION_KEYS: readonly string[] = ORG_PERMISSIONS.map((p) => p.key);

export function isOrgPermission(value: unknown): value is OrgPermission {
  return typeof value === "string" && PERMISSION_KEYS.includes(value);
}

export interface OrgMembership {
  role: OrgRole;
  permissions: string[];
}

/** Admins can do everything; members only what they've been granted. */
export function can(member: OrgMembership | null | undefined, permission: OrgPermission): boolean {
  if (!member) return false;
  if (member.role === "admin") return true;
  return member.permissions.includes(permission);
}

/** Managing members and their permissions is for admins only; it can't be granted. */
export function canManageMembers(member: OrgMembership | null | undefined): boolean {
  return member?.role === "admin";
}

/**
 * An organization must always keep one admin, or nobody could manage it.
 * True when changing `targetUserId` away from admin (demoting or removing
 * them) would leave none.
 */
export function wouldRemoveLastAdmin(
  members: { user_id: string; role: OrgRole }[],
  targetUserId: string,
): boolean {
  const admins = members.filter((m) => m.role === "admin");
  return admins.length === 1 && admins[0].user_id === targetUserId;
}

/** The tabs down the left of a project. The canvas is the project's main page. */
export const PROJECT_SECTIONS = [
  { slug: "documents", label: "Documents", blurb: "Specifications, reports, and reference files for this project." },
  { slug: "requirements", label: "Requirements", blurb: "What the system must do, traced to the sub-systems that satisfy it." },
  { slug: "constraints", label: "Constraints", blurb: "The limits the design has to live within: mass, power, cost, schedule." },
] as const;

export type ProjectSectionSlug = (typeof PROJECT_SECTIONS)[number]["slug"];

export function findProjectSection(slug: string) {
  return PROJECT_SECTIONS.find((s) => s.slug === slug) ?? null;
}

/**
 * Where a new sub-system lands on the canvas: left to right, four to a row,
 * in the order they were created. Positions are saved, so boxes stay put once
 * dragging is built.
 */
export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 84;
export function nextNodePosition(existingCount: number): { x: number; y: number } {
  const col = existingCount % 4;
  const row = Math.floor(existingCount / 4);
  return { x: 96 + col * 340, y: 120 + row * 190 };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
