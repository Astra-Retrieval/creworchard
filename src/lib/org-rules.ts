/**
 * The pure rules for organizations, with no database or framework imports so
 * they can be tested on their own (scripts/test-org-rules.ts).
 * src/lib/orgs.ts wraps them with the database.
 *
 *   Owner    the one person who owns the organization and its seats; can do everything
 *   Admins   can do everything except change the owner
 *   Members  can do only what an owner or admin has granted them
 *   Others   nothing
 *
 * Roles inside a project are separate: see project-rules.ts.
 */

export type OrgRole = "owner" | "admin" | "member";
export const ORG_ROLE_LABELS: Record<OrgRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };

/**
 * Every permission that can be granted to a member. To add one, add it here:
 * the members table on the organization dashboard picks it up.
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

/** Owners and admins run the organization. */
export function isOrgManager(member: Pick<OrgMembership, "role"> | null | undefined): boolean {
  return member?.role === "owner" || member?.role === "admin";
}

/** Owners and admins can do everything; members only what they've been granted. */
export function can(member: OrgMembership | null | undefined, permission: OrgPermission): boolean {
  if (!member) return false;
  if (isOrgManager(member)) return true;
  return member.permissions.includes(permission);
}

/** Assigning seats, roles, and permissions is for the owner and admins; it can't be granted. */
export function canManageMembers(member: Pick<OrgMembership, "role"> | null | undefined): boolean {
  return isOrgManager(member);
}

/**
 * Whether `actor` may change or remove `target`. Nobody can change the owner
 * (so an organization always has one), and only the owner can change an admin.
 */
export function canChangeMember(
  actor: Pick<OrgMembership, "role"> | null | undefined,
  target: Pick<OrgMembership, "role">,
): boolean {
  if (!canManageMembers(actor)) return false;
  if (target.role === "owner") return false;
  if (target.role === "admin") return actor?.role === "owner";
  return true;
}

/**
 * Seats. Everyone in an organization, the owner included, takes one seat, and
 * the organization has as many as its owner's plan (profiles.seats).
 * A limit of null means unlimited.
 */
export function seatsLeft(limit: number | null, used: number): number | null {
  return limit === null ? null : Math.max(0, limit - used);
}
export function hasFreeSeat(limit: number | null, used: number): boolean {
  return limit === null || used < limit;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
/** A list of ids from a form or an action call: only valid, distinct uuids survive. */
export function uuidList(value: unknown, max = 200): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isUuid))].slice(0, max);
}
