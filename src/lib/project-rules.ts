/**
 * The pure rules for a project's team, tabs, and sub-system colors. No
 * database or framework imports (tested by scripts/test-org-rules.ts).
 *
 *   Lead              runs the project: adds people from the organization and sets their roles
 *   Systems engineer  can create sub-systems and integrations
 *   Contributor       can edit documents and bills of materials, and assign people
 *   Viewer            can look, but not change anything
 *
 * The organization's owner and admins act as a lead on every project.
 * Each project has its own team, so one person can hold a different role on each.
 */
import { isOrgManager, type OrgMembership } from "./org-rules.ts";

export const PROJECT_ROLES = [
  { key: "lead", label: "Project lead", blurb: "Adds people and sets roles" },
  { key: "systems_engineer", label: "Systems engineer", blurb: "Creates sub-systems and integrations" },
  { key: "contributor", label: "Contributor", blurb: "Edits documents and BoMs" },
  { key: "viewer", label: "Viewer", blurb: "Read only" },
] as const;

export type ProjectRole = (typeof PROJECT_ROLES)[number]["key"];
export type ProjectAbility = "team.manage" | "structure.create" | "content.edit";

const ABILITIES: Record<ProjectRole, ProjectAbility[]> = {
  lead: ["team.manage", "structure.create", "content.edit"],
  systems_engineer: ["structure.create", "content.edit"],
  contributor: ["content.edit"],
  viewer: [],
};

export function isProjectRole(value: unknown): value is ProjectRole {
  return typeof value === "string" && value in ABILITIES;
}
export function projectRoleLabel(role: ProjectRole): string {
  return PROJECT_ROLES.find((r) => r.key === role)?.label ?? role;
}

/**
 * The role someone effectively has on a project: lead for the organization's
 * owner and admins, otherwise their role on the project's team, otherwise
 * none (they can't see the project at all).
 */
export function effectiveProjectRole(
  org: Pick<OrgMembership, "role"> | null | undefined,
  projectRole: ProjectRole | null | undefined,
): ProjectRole | null {
  if (!org) return null;
  if (isOrgManager(org)) return "lead";
  return projectRole ?? null;
}

export function projectCan(role: ProjectRole | null | undefined, ability: ProjectAbility): boolean {
  return role ? ABILITIES[role].includes(ability) : false;
}

/**
 * A project keeps one lead on its team. True when changing `targetUserId`
 * away from lead (demoting or removing them) would leave the team without one.
 */
export function wouldRemoveLastLead(team: { user_id: string; role: ProjectRole }[], targetUserId: string): boolean {
  const leads = team.filter((m) => m.role === "lead");
  return leads.length === 1 && leads[0].user_id === targetUserId;
}

/** The tabs down the left of a project, after the canvas. */
export const PROJECT_SECTIONS = [
  { slug: "team", label: "Team" },
  { slug: "documents", label: "Documents" },
  { slug: "bom", label: "Bill of materials" },
  { slug: "requirements", label: "Requirements" },
  { slug: "constraints", label: "Constraints" },
] as const;
export type ProjectSectionSlug = (typeof PROJECT_SECTIONS)[number]["slug"];

/** Sub-system colors, from the brand palette. Each new sub-system gets one at random. */
export const SUBSYSTEM_COLORS = ["mint", "blue", "violet", "gold", "coral"] as const;
export type SubsystemColor = (typeof SUBSYSTEM_COLORS)[number];
export function isSubsystemColor(value: unknown): value is SubsystemColor {
  return typeof value === "string" && (SUBSYSTEM_COLORS as readonly string[]).includes(value);
}
export function randomSubsystemColor(random: () => number = Math.random): SubsystemColor {
  return SUBSYSTEM_COLORS[Math.min(SUBSYSTEM_COLORS.length - 1, Math.floor(random() * SUBSYSTEM_COLORS.length))];
}

/**
 * The people on an integration must each belong to one of the sub-systems it
 * connects. Returns the ids that don't.
 */
export function peopleOutsideSubsystems(
  memberIds: string[],
  subsystems: { id: string; member_ids: string[] }[],
  subsystemIds: string[],
): string[] {
  const allowed = new Set(subsystems.filter((s) => subsystemIds.includes(s.id)).flatMap((s) => s.member_ids));
  return memberIds.filter((id) => !allowed.has(id));
}
