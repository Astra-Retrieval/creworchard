import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { decideProductAccess, getProductAccessMode } from "@/lib/product-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOrgManager, isUuid, type OrgRole } from "@/lib/org-rules";
import { effectiveProjectRole, isSubsystemColor, projectCan, type ProjectRole } from "@/lib/project-rules";
import type { Abilities, BomItem, DocSummary, IntegrationNode, Person, Pin, SubsystemNode } from "@/lib/workspace-types";

/**
 * Organizations, projects, and everything inside a project.
 *
 * These tables are server-only (RLS on, no policies), so every read and write
 * goes through the service-role client. That makes the guards in this file
 * the security boundary: nothing should query these tables without first
 * calling requireProductUser / requireOrg / requireProject.
 */

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Membership {
  organization_id: string;
  user_id: string;
  role: OrgRole;
  permissions: string[];
  created_at: string;
}

export interface OrgMemberRow extends Membership {
  email: string;
  full_name: string | null;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

type ProfileLite = { id: string; email: string; full_name: string | null };

/**
 * The signed-in person, if they're allowed into the product. Pages under /app
 * are already behind the layout's check, but server actions aren't, so both
 * call this. Cached per request.
 */
export const requireProductUser = cache(async () => {
  const session = await getSession();
  const access = decideProductAccess(session?.profile, Boolean(session), await getProductAccessMode());
  if (!session || !access.allowed) {
    if (!access.allowed && access.next === "sign_in") redirect("/signin?notice=app");
    notFound();
  }
  const db = createAdminClient();
  if (!db) notFound();
  return { session, userId: session.user.id, db };
});

type Db = Awaited<ReturnType<typeof requireProductUser>>["db"];

async function profilesFor(db: Db, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, ProfileLite>();
  const { data, error } = await db.from("profiles").select("id, email, full_name").in("id", userIds).returns<ProfileLite[]>();
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, p]));
}

/** Every organization the signed-in person belongs to, oldest first. */
export async function listMyOrganizations() {
  const { db, userId } = await requireProductUser();
  const { data, error } = await db
    .from("organization_members")
    .select("role, organizations(id, name, created_at)")
    .eq("user_id", userId)
    .order("created_at")
    .returns<{ role: OrgRole; organizations: Organization }[]>();
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row.organizations, role: row.role }));
}

/**
 * The organization and the signed-in person's membership of it. Answers
 * "page not found" for anyone who isn't a member, so an organization's
 * existence isn't revealed to outsiders.
 */
export const requireOrg = cache(async (orgId: string) => {
  const ctx = await requireProductUser();
  if (!isUuid(orgId)) notFound();
  const { data: membership, error } = await ctx.db
    .from("organization_members")
    .select("organization_id, user_id, role, permissions, created_at")
    .eq("organization_id", orgId)
    .eq("user_id", ctx.userId)
    .maybeSingle<Membership>();
  if (error) throw error;
  if (!membership) notFound();
  const { data: org, error: orgError } = await ctx.db
    .from("organizations")
    .select("id, name, created_at")
    .eq("id", orgId)
    .maybeSingle<Organization>();
  if (orgError) throw orgError;
  if (!org) notFound();
  return { ...ctx, org, membership };
});

/**
 * A project the signed-in person can see: the organization's owner and admins
 * see every project (as a lead), everyone else only the projects whose team
 * they're on. Anything else is "page not found".
 */
export const requireProject = cache(async (orgId: string, projectId: string) => {
  const ctx = await requireOrg(orgId);
  if (!isUuid(projectId)) notFound();
  const { data: project, error } = await ctx.db
    .from("projects")
    .select("id, organization_id, name, created_at")
    .eq("id", projectId)
    .eq("organization_id", orgId)
    .maybeSingle<Project>();
  if (error) throw error;
  if (!project) notFound();
  const { data: seat, error: seatError } = await ctx.db
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", ctx.userId)
    .maybeSingle<{ role: ProjectRole }>();
  if (seatError) throw seatError;
  const projectRole = effectiveProjectRole(ctx.membership, seat?.role);
  if (!projectRole) notFound();
  const abilities: Abilities = {
    manageTeam: projectCan(projectRole, "team.manage"),
    createStructure: projectCan(projectRole, "structure.create"),
    editContent: projectCan(projectRole, "content.edit"),
  };
  return { ...ctx, project, projectRole, abilities };
});

/** The projects the signed-in person can see in an organization, newest first. */
export async function listProjects(orgId: string) {
  const { db, membership, userId } = await requireOrg(orgId);
  const { data, error } = await db
    .from("projects")
    .select("id, organization_id, name, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .returns<Project[]>();
  if (error) throw error;
  const { data: seats, error: seatError } = await db
    .from("project_members")
    .select("project_id, role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .returns<{ project_id: string; role: ProjectRole }[]>();
  if (seatError) throw seatError;
  const mine = new Map((seats ?? []).map((s) => [s.project_id, s.role]));
  return (data ?? [])
    .map((p) => ({ ...p, role: effectiveProjectRole(membership, mine.get(p.id)) }))
    .filter((p): p is Project & { role: ProjectRole } => p.role !== null);
}

/** Members of an organization with their names and emails: owner, then admins, then members. */
export async function listMembers(orgId: string): Promise<OrgMemberRow[]> {
  const { db } = await requireOrg(orgId);
  const { data: members, error } = await db
    .from("organization_members")
    .select("organization_id, user_id, role, permissions, created_at")
    .eq("organization_id", orgId)
    .order("created_at")
    .returns<Membership[]>();
  if (error) throw error;
  const rows = members ?? [];
  // organization_members points at auth.users, not profiles, so join in code.
  const byId = await profilesFor(db, rows.map((m) => m.user_id));
  const rank: Record<OrgRole, number> = { owner: 0, admin: 1, member: 2 };
  return rows
    .map((m) => ({ ...m, email: byId.get(m.user_id)?.email ?? "", full_name: byId.get(m.user_id)?.full_name ?? null }))
    .sort((a, b) => rank[a.role] - rank[b.role]);
}

/**
 * How many seats an organization has: its owner's plan (profiles.seats).
 * null means unlimited, which is the case while the owner is a Crew Orchard
 * site admin or tester, so the team can try the product before launch.
 */
export async function loadSeatLimit(db: Db, orgId: string): Promise<number | null> {
  const { data: owner, error } = await db
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("role", "owner")
    .maybeSingle<{ user_id: string }>();
  if (error) throw error;
  if (!owner) return 1;
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("seats, role, is_tester")
    .eq("id", owner.user_id)
    .maybeSingle<{ seats: number; role: string; is_tester: boolean }>();
  if (profileError) throw profileError;
  if (!profile) return 1;
  if (profile.role === "admin" || profile.is_tester) return null;
  return Math.max(1, profile.seats);
}

/** A project's team with names and emails, leads first. */
export async function listProjectTeam(orgId: string, projectId: string): Promise<Person[]> {
  const { db } = await requireProject(orgId, projectId);
  const { data, error } = await db
    .from("project_members")
    .select("user_id, role")
    .eq("project_id", projectId)
    .order("created_at")
    .returns<{ user_id: string; role: ProjectRole }[]>();
  if (error) throw error;
  const rows = data ?? [];
  const byId = await profilesFor(db, rows.map((m) => m.user_id));
  return rows
    .map((m) => ({ ...m, email: byId.get(m.user_id)?.email ?? "", full_name: byId.get(m.user_id)?.full_name ?? null }))
    .sort((a, b) => Number(b.role === "lead") - Number(a.role === "lead"));
}

/** A project's sub-systems and integrations, with who is assigned to each. */
export async function loadStructure(db: Db, projectId: string) {
  const [subsystems, subsystemMembers, integrations, links, integrationMembers] = await Promise.all([
    db.from("subsystems").select("id, name, note, color, x, y").eq("project_id", projectId).order("created_at")
      .returns<{ id: string; name: string; note: string | null; color: string; x: number; y: number }[]>(),
    db.from("subsystem_members").select("subsystem_id, user_id").eq("project_id", projectId).order("created_at")
      .returns<{ subsystem_id: string; user_id: string }[]>(),
    db.from("integrations").select("id, name").eq("project_id", projectId).order("created_at").returns<{ id: string; name: string }[]>(),
    db.from("integration_subsystems").select("integration_id, subsystem_id").eq("project_id", projectId)
      .returns<{ integration_id: string; subsystem_id: string }[]>(),
    db.from("integration_members").select("integration_id, user_id").eq("project_id", projectId).order("created_at")
      .returns<{ integration_id: string; user_id: string }[]>(),
  ]);
  for (const r of [subsystems, subsystemMembers, integrations, links, integrationMembers]) if (r.error) throw r.error;

  const subsystemNodes: SubsystemNode[] = (subsystems.data ?? []).map((s) => ({
    ...s,
    color: isSubsystemColor(s.color) ? s.color : "mint",
    member_ids: (subsystemMembers.data ?? []).filter((m) => m.subsystem_id === s.id).map((m) => m.user_id),
  }));
  const order = new Map(subsystemNodes.map((s, i) => [s.id, i]));
  const integrationNodes: IntegrationNode[] = (integrations.data ?? []).map((i) => ({
    ...i,
    subsystem_ids: (links.data ?? [])
      .filter((l) => l.integration_id === i.id)
      .map((l) => l.subsystem_id)
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)),
    member_ids: (integrationMembers.data ?? []).filter((m) => m.integration_id === i.id).map((m) => m.user_id),
  }));
  return { subsystems: subsystemNodes, integrations: integrationNodes };
}

export async function listDocuments(db: Db, projectId: string): Promise<DocSummary[]> {
  const { data, error } = await db
    .from("documents")
    .select("id, kind, title, subsystem_id, integration_id, updated_at, head_version")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .returns<DocSummary[]>();
  if (error) throw error;
  return data ?? [];
}

/** Everything the canvas page needs in one go. */
export async function loadWorkspace(orgId: string, projectId: string) {
  const ctx = await requireProject(orgId, projectId);
  const [structure, people, documents, pins] = await Promise.all([
    loadStructure(ctx.db, projectId),
    listProjectTeam(orgId, projectId),
    listDocuments(ctx.db, projectId),
    ctx.db.from("subsystem_pins").select("subsystem_id, document_id").eq("project_id", projectId).order("created_at").returns<Pin[]>(),
  ]);
  if (pins.error) throw pins.error;
  return { ...structure, people, documents, pins: pins.data ?? [], abilities: ctx.abilities };
}

/** Every BoM line in the project, for the project-wide bill of materials. */
export async function listProjectBom(orgId: string, projectId: string): Promise<BomItem[]> {
  const { db } = await requireProject(orgId, projectId);
  const { data, error } = await db
    .from("bom_items")
    .select("id, subsystem_id, part_number, description, quantity, unit_cost")
    .eq("project_id", projectId)
    .order("created_at")
    .returns<BomItem[]>();
  if (error) throw error;
  return (data ?? []).map((i) => ({ ...i, quantity: Number(i.quantity), unit_cost: Number(i.unit_cost) }));
}

export { isOrgManager };
