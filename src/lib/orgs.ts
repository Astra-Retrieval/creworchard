import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { decideProductAccess, getProductAccessMode } from "@/lib/product-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid, type OrgRole } from "@/lib/org-rules";

/**
 * Organizations, projects, sub-systems, and integrations.
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

export interface Subsystem {
  id: string;
  project_id: string;
  name: string;
  x: number;
  y: number;
}

export interface Integration {
  id: string;
  project_id: string;
  source_id: string;
  target_id: string;
  name: string | null;
}

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

/** A project, checked to belong to an organization the signed-in person is in. */
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
  return { ...ctx, project };
});

export async function listProjects(orgId: string) {
  const { db } = await requireOrg(orgId);
  const { data, error } = await db
    .from("projects")
    .select("id, organization_id, name, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .returns<Project[]>();
  if (error) throw error;
  return data ?? [];
}

/** Members of an organization with their names and emails, admins first. */
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
  if (rows.length === 0) return [];
  // organization_members points at auth.users, not profiles, so join in code.
  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select("id, email, full_name")
    .in("id", rows.map((m) => m.user_id))
    .returns<{ id: string; email: string; full_name: string | null }[]>();
  if (profileError) throw profileError;
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows
    .map((m) => ({ ...m, email: byId.get(m.user_id)?.email ?? "", full_name: byId.get(m.user_id)?.full_name ?? null }))
    .sort((a, b) => Number(b.role === "admin") - Number(a.role === "admin"));
}

/** Everything drawn on a project's canvas. */
export async function loadCanvas(orgId: string, projectId: string) {
  const { db } = await requireProject(orgId, projectId);
  const [subsystems, integrations] = await Promise.all([
    db.from("subsystems").select("id, project_id, name, x, y").eq("project_id", projectId).order("created_at").returns<Subsystem[]>(),
    db.from("integrations").select("id, project_id, source_id, target_id, name").eq("project_id", projectId).order("created_at").returns<Integration[]>(),
  ]);
  if (subsystems.error) throw subsystems.error;
  if (integrations.error) throw integrations.error;
  return { subsystems: subsystems.data ?? [], integrations: integrations.data ?? [] };
}
