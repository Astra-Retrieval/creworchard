"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cleanName } from "@/lib/names";
import {
  can,
  canManageMembers,
  isOrgPermission,
  isUuid,
  nextNodePosition,
  wouldRemoveLastAdmin,
  type OrgRole,
} from "@/lib/org-rules";
import { requireOrg, requireProductUser, requireProject } from "@/lib/orgs";
import type { FormState } from "@/app/waitlist/actions";

/**
 * Every write in the product. Each action starts with a guard from
 * src/lib/orgs.ts (which 404s anyone who isn't allowed in), then checks the
 * specific permission, then writes with the service-role client.
 */

const orgPath = (orgId: string) => `/app/org/${orgId}`;
const projectPath = (orgId: string, projectId: string) => `/app/org/${orgId}/project/${projectId}`;
const TRY_AGAIN = "Something went wrong on our side. Please try again.";

/** Creates an organization and makes its creator the first admin. */
export async function createOrganization(_prev: FormState, fd: FormData): Promise<FormState> {
  const { db, userId } = await requireProductUser();
  const name = cleanName(fd.get("name"));
  if (!name) return { status: "error", message: "Give your organization a name." };

  const { data: org, error } = await db.from("organizations").insert({ name, created_by: userId }).select("id").single<{ id: string }>();
  if (error || !org) {
    console.error("create organization failed", error);
    return { status: "error", message: TRY_AGAIN };
  }
  const { error: memberError } = await db
    .from("organization_members")
    .insert({ organization_id: org.id, user_id: userId, role: "admin" });
  if (memberError) {
    console.error("create organization admin failed", memberError);
    // Don't leave an organization nobody can reach.
    await db.from("organizations").delete().eq("id", org.id);
    return { status: "error", message: TRY_AGAIN };
  }
  redirect(orgPath(org.id));
}

/** Creates a project. Needs the "projects.create" permission (admins always have it). */
export async function createProject(orgId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { db, userId, membership } = await requireOrg(orgId);
  if (!can(membership, "projects.create")) {
    return { status: "error", message: "You don't have permission to create projects. Ask an organization admin." };
  }
  const name = cleanName(fd.get("name"));
  if (!name) return { status: "error", message: "Give the project a name." };

  const { data: project, error } = await db
    .from("projects")
    .insert({ organization_id: orgId, name, created_by: userId })
    .select("id")
    .single<{ id: string }>();
  if (error || !project) {
    console.error("create project failed", error);
    return { status: "error", message: TRY_AGAIN };
  }
  revalidatePath(orgPath(orgId));
  redirect(projectPath(orgId, project.id));
}

/** Adds someone who already has a Crew Orchard account to the organization. Admins only. */
export async function addMember(orgId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { db, membership } = await requireOrg(orgId);
  if (!canManageMembers(membership)) return { status: "error", message: "Only organization admins can add members." };

  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (!email) return { status: "error", message: "Enter their email address." };
  // Supabase stores account emails in lowercase, so an exact match is case-insensitive.

  const { data: profile, error } = await db.from("profiles").select("id").eq("email", email).maybeSingle<{ id: string }>();
  if (error) {
    console.error("member lookup failed", error);
    return { status: "error", message: TRY_AGAIN };
  }
  if (!profile) {
    return { status: "error", message: "Nobody has a Crew Orchard account with that email yet. They need to create one first." };
  }
  const { error: insertError } = await db.from("organization_members").insert({ organization_id: orgId, user_id: profile.id });
  if (insertError) {
    if (insertError.code === "23505") return { status: "error", message: "They're already in this organization." };
    console.error("add member failed", insertError);
    return { status: "error", message: TRY_AGAIN };
  }
  revalidatePath(orgPath(orgId));
  return { status: "success", message: `${email} added.` };
}

/** Grants or removes one permission for one member. Admins only. */
export async function setMemberPermission(orgId: string, fd: FormData) {
  const { db, membership } = await requireOrg(orgId);
  if (!canManageMembers(membership)) return;
  const userId = fd.get("user_id");
  const permission = fd.get("permission");
  const granted = fd.get("granted") === "true";
  if (!isUuid(userId) || !isOrgPermission(permission)) return;

  const { data: target } = await db
    .from("organization_members")
    .select("permissions")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle<{ permissions: string[] }>();
  if (!target) return;
  const next = new Set(target.permissions.filter(isOrgPermission));
  if (granted) next.add(permission);
  else next.delete(permission);
  const { error } = await db
    .from("organization_members")
    .update({ permissions: [...next] })
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (error) console.error("set member permission failed", error);
  revalidatePath(orgPath(orgId));
}

async function loadRoles(db: Awaited<ReturnType<typeof requireOrg>>["db"], orgId: string) {
  const { data } = await db
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", orgId)
    .returns<{ user_id: string; role: OrgRole }[]>();
  return data ?? [];
}

/** Makes a member an admin, or an admin a member. The last admin can't be demoted. */
export async function setMemberRole(orgId: string, fd: FormData) {
  const { db, membership } = await requireOrg(orgId);
  if (!canManageMembers(membership)) return;
  const userId = fd.get("user_id");
  const role = fd.get("role");
  if (!isUuid(userId) || (role !== "admin" && role !== "member")) return;
  if (role === "member" && wouldRemoveLastAdmin(await loadRoles(db, orgId), userId)) return;

  const { error } = await db.from("organization_members").update({ role }).eq("organization_id", orgId).eq("user_id", userId);
  if (error) console.error("set member role failed", error);
  revalidatePath(orgPath(orgId));
}

/** Removes someone from the organization. The last admin can't be removed. */
export async function removeMember(orgId: string, fd: FormData) {
  const { db, membership } = await requireOrg(orgId);
  if (!canManageMembers(membership)) return;
  const userId = fd.get("user_id");
  if (!isUuid(userId)) return;
  if (wouldRemoveLastAdmin(await loadRoles(db, orgId), userId)) return;

  const { error } = await db.from("organization_members").delete().eq("organization_id", orgId).eq("user_id", userId);
  if (error) console.error("remove member failed", error);
  revalidatePath(orgPath(orgId));
}

/** Adds a sub-system to a project's canvas. Any member of the organization can. */
export async function createSubsystem(orgId: string, projectId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { db, userId } = await requireProject(orgId, projectId);
  const name = cleanName(fd.get("name"));
  if (!name) return { status: "error", message: "Give the sub-system a name." };

  const { count, error: countError } = await db
    .from("subsystems")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (countError) {
    console.error("count sub-systems failed", countError);
    return { status: "error", message: TRY_AGAIN };
  }
  const { error } = await db
    .from("subsystems")
    .insert({ project_id: projectId, name, created_by: userId, ...nextNodePosition(count ?? 0) });
  if (error) {
    console.error("create sub-system failed", error);
    return { status: "error", message: TRY_AGAIN };
  }
  revalidatePath(projectPath(orgId, projectId));
  return { status: "success", message: `${name} added.` };
}

/** Links two sub-systems of the same project. Any member of the organization can. */
export async function createIntegration(orgId: string, projectId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { db, userId } = await requireProject(orgId, projectId);
  const source = fd.get("source_id");
  const target = fd.get("target_id");
  const name = cleanName(fd.get("name")) || null;
  if (!isUuid(source) || !isUuid(target)) return { status: "error", message: "Choose the two sub-systems to connect." };
  if (source === target) return { status: "error", message: "Choose two different sub-systems." };

  // The database also enforces that both ends belong to this project (composite foreign keys).
  const { error } = await db
    .from("integrations")
    .insert({ project_id: projectId, source_id: source, target_id: target, name, created_by: userId });
  if (error) {
    if (error.code === "23505") return { status: "error", message: "Those two sub-systems are already connected." };
    if (error.code === "23503") return { status: "error", message: "One of those sub-systems no longer exists. Refresh and try again." };
    console.error("create integration failed", error);
    return { status: "error", message: TRY_AGAIN };
  }
  revalidatePath(projectPath(orgId, projectId));
  return { status: "success", message: "Integration added." };
}

/** At most this many feature requests and questions per person per hour. */
const FEEDBACK_PER_HOUR = 10;

/**
 * Saves a feature request or a question from inside a project. It lands in
 * the same inbox as the contact form (/admin → Messages), tagged by topic and
 * with the organization and project it was sent from.
 */
export async function sendFeedback(orgId: string, projectId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { db, session, org, project } = await requireProject(orgId, projectId);
  const topic = fd.get("kind") === "question" ? "question" : "feature_request";
  const body = String(fd.get("message") ?? "").trim();
  if (body.length < 2) {
    return { status: "error", message: topic === "question" ? "Write your question first." : "Describe the feature first." };
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= FEEDBACK_PER_HOUR) {
    return { status: "error", message: "You've sent several in the last hour. Please try again a little later." };
  }

  const context = `[${org.name} / ${project.name}]\n`;
  const { error } = await db.from("contact_messages").insert({
    name: cleanName(session.profile?.full_name) || "Crew Orchard member",
    email: (session.profile?.email ?? session.user.email ?? "").toLowerCase(),
    topic,
    message: (context + body).slice(0, 4000),
    user_id: session.user.id,
  });
  if (error) {
    console.error("feedback insert failed", error);
    return { status: "error", message: TRY_AGAIN };
  }
  return {
    status: "success",
    message: topic === "question" ? "Question sent. We'll reply by email." : "Request sent. Thank you, we read every one.",
  };
}
