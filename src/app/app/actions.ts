"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cleanName } from "@/lib/names";
import { can, canChangeMember, canManageMembers, hasFreeSeat, isOrgPermission, isUuid, uuidList } from "@/lib/org-rules";
import { isProjectRole, peopleOutsideSubsystems, randomSubsystemColor, wouldRemoveLastLead, type ProjectRole } from "@/lib/project-rules";
import { nextNodePosition } from "@/lib/canvas-layout";
import { loadSeatLimit, loadStructure, requireOrg, requireProductUser, requireProject } from "@/lib/orgs";
import { MAX_CONTENT_CHARS, docToText, isDocContent, type DocContent } from "@/lib/doc-content";
import type { BomItem, DocFull, DocScope, Result, VersionMeta } from "@/lib/workspace-types";
import type { FormState } from "@/app/waitlist/actions";

/**
 * Every write in the product. Each action starts with a guard from
 * src/lib/orgs.ts (which 404s anyone who isn't allowed in), then checks the
 * specific permission, then writes with the service-role client.
 *
 * Actions used by forms take FormData; actions called from the project
 * workspace take a plain object and return a Result (see workspace-types.ts).
 */

const orgPath = (orgId: string) => `/app/org/${orgId}`;
const projectPath = (orgId: string, projectId: string) => `/app/org/${orgId}/project/${projectId}`;
const TRY_AGAIN = "Something went wrong on our side. Please try again.";
const fail = (message: string = TRY_AGAIN) => ({ ok: false as const, message });
const NO_STRUCTURE = "Your role on this project can't create sub-systems or integrations. Ask the project lead.";
const NO_EDIT = "Your role on this project is read only. Ask the project lead for edit access.";

// ── Organization ─────────────────────────────────────────────

/** Creates an organization. Its creator owns it. */
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
    .insert({ organization_id: org.id, user_id: userId, role: "owner" });
  if (memberError) {
    console.error("create organization owner failed", memberError);
    // Don't leave an organization nobody can reach.
    await db.from("organizations").delete().eq("id", org.id);
    return { status: "error", message: TRY_AGAIN };
  }
  redirect(orgPath(org.id));
}

/**
 * Creates a project and makes its creator the project lead. Needs the
 * "projects.create" permission (the owner and admins always have it).
 */
export async function createProject(orgId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { db, userId, membership } = await requireOrg(orgId);
  if (!can(membership, "projects.create")) {
    return { status: "error", message: "You don't have permission to create projects. Ask the organization's owner or an admin." };
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
  const { error: leadError } = await db
    .from("project_members")
    .insert({ project_id: project.id, organization_id: orgId, user_id: userId, role: "lead" });
  if (leadError) {
    console.error("create project lead failed", leadError);
    await db.from("projects").delete().eq("id", project.id);
    return { status: "error", message: TRY_AGAIN };
  }
  revalidatePath(orgPath(orgId));
  redirect(projectPath(orgId, project.id));
}

/**
 * Assigns a seat: adds someone who already has a Crew Orchard account to the
 * organization. Owner and admins only, and only while a seat is free.
 */
export async function addMember(orgId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { db, membership } = await requireOrg(orgId);
  if (!canManageMembers(membership)) return { status: "error", message: "Only the owner and admins can assign seats." };

  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (!email) return { status: "error", message: "Enter their email address." };

  const [limit, { count, error: countError }] = await Promise.all([
    loadSeatLimit(db, orgId),
    db.from("organization_members").select("user_id", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);
  if (countError) {
    console.error("seat count failed", countError);
    return { status: "error", message: TRY_AGAIN };
  }
  if (!hasFreeSeat(limit, count ?? 0)) {
    return { status: "error", message: `All ${limit} of this organization's seats are assigned. Unassign one, or add seats to the owner's plan.` };
  }

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
    if (insertError.code === "23505") return { status: "error", message: "They already have a seat in this organization." };
    console.error("add member failed", insertError);
    return { status: "error", message: TRY_AGAIN };
  }
  revalidatePath(orgPath(orgId));
  return { status: "success", message: `Seat assigned to ${email}.` };
}

/** The member a form is about, if the signed-in person is allowed to change them. */
async function changeableMember(orgId: string, fd: FormData) {
  const ctx = await requireOrg(orgId);
  const userId = fd.get("user_id");
  if (!isUuid(userId)) return null;
  const { data: target } = await ctx.db
    .from("organization_members")
    .select("role, permissions")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle<{ role: "owner" | "admin" | "member"; permissions: string[] }>();
  if (!target || !canChangeMember(ctx.membership, target)) return null;
  return { ...ctx, targetId: userId, target };
}

/** Grants or removes one permission for one member. */
export async function setMemberPermission(orgId: string, fd: FormData) {
  const ctx = await changeableMember(orgId, fd);
  const permission = fd.get("permission");
  if (!ctx || !isOrgPermission(permission)) return;
  const next = new Set(ctx.target.permissions.filter(isOrgPermission));
  if (fd.get("granted") === "true") next.add(permission);
  else next.delete(permission);
  const { error } = await ctx.db
    .from("organization_members")
    .update({ permissions: [...next] })
    .eq("organization_id", orgId)
    .eq("user_id", ctx.targetId);
  if (error) console.error("set member permission failed", error);
  revalidatePath(orgPath(orgId));
}

/** Makes a member an admin, or an admin a member. Only the owner can change an admin. */
export async function setMemberRole(orgId: string, fd: FormData) {
  const ctx = await changeableMember(orgId, fd);
  const role = fd.get("role");
  if (!ctx || (role !== "admin" && role !== "member")) return;
  // Only the owner hands out the admin role.
  if (role === "admin" && ctx.membership.role !== "owner") return;
  const { error } = await ctx.db.from("organization_members").update({ role }).eq("organization_id", orgId).eq("user_id", ctx.targetId);
  if (error) console.error("set member role failed", error);
  revalidatePath(orgPath(orgId));
}

/**
 * Unassigns a seat: removes someone from the organization. The database
 * removes them from its project teams, sub-systems, and integrations too.
 */
export async function removeMember(orgId: string, fd: FormData) {
  const ctx = await changeableMember(orgId, fd);
  if (!ctx) return;
  const { error } = await ctx.db.from("organization_members").delete().eq("organization_id", orgId).eq("user_id", ctx.targetId);
  if (error) console.error("remove member failed", error);
  revalidatePath(orgPath(orgId));
}

// ── Project team ─────────────────────────────────────────────

async function loadTeamRoles(orgId: string, projectId: string) {
  const { db } = await requireProject(orgId, projectId);
  const { data } = await db.from("project_members").select("user_id, role").eq("project_id", projectId).returns<{ user_id: string; role: ProjectRole }[]>();
  return data ?? [];
}

/** Adds someone from the organization to the project's team with a role. Leads only. */
export async function addProjectMember(orgId: string, projectId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { db, abilities } = await requireProject(orgId, projectId);
  if (!abilities.manageTeam) return { status: "error", message: "Only the project lead can add people." };
  const userId = fd.get("user_id");
  const role = fd.get("role");
  if (!isUuid(userId)) return { status: "error", message: "Choose who to add." };
  if (!isProjectRole(role)) return { status: "error", message: "Choose their role." };
  // The foreign key to organization_members rejects anyone outside the organization.
  const { error } = await db.from("project_members").insert({ project_id: projectId, organization_id: orgId, user_id: userId, role });
  if (error) {
    if (error.code === "23505") return { status: "error", message: "They're already on this project." };
    if (error.code === "23503") return { status: "error", message: "They aren't in this organization any more." };
    console.error("add project member failed", error);
    return { status: "error", message: TRY_AGAIN };
  }
  revalidatePath(projectPath(orgId, projectId), "layout");
  return { status: "success", message: "Added to the project." };
}

/** Changes someone's role on the project. Leads only; the last lead can't be demoted. */
export async function setProjectMemberRole(orgId: string, projectId: string, fd: FormData) {
  const { db, abilities } = await requireProject(orgId, projectId);
  const userId = fd.get("user_id");
  const role = fd.get("role");
  if (!abilities.manageTeam || !isUuid(userId) || !isProjectRole(role)) return;
  if (role !== "lead" && wouldRemoveLastLead(await loadTeamRoles(orgId, projectId), userId)) return;
  const { error } = await db.from("project_members").update({ role }).eq("project_id", projectId).eq("user_id", userId);
  if (error) console.error("set project role failed", error);
  revalidatePath(projectPath(orgId, projectId), "layout");
}

/** Takes someone off the project (and its sub-systems and integrations). Leads only. */
export async function removeProjectMember(orgId: string, projectId: string, fd: FormData) {
  const { db, abilities } = await requireProject(orgId, projectId);
  const userId = fd.get("user_id");
  if (!abilities.manageTeam || !isUuid(userId)) return;
  if (wouldRemoveLastLead(await loadTeamRoles(orgId, projectId), userId)) return;
  const { error } = await db.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
  if (error) console.error("remove project member failed", error);
  revalidatePath(projectPath(orgId, projectId), "layout");
}

// ── Canvas: sub-systems and integrations ─────────────────────

/** Adds a sub-system with a note and the people assigned to it. Leads and systems engineers. */
export async function createSubsystem(
  orgId: string,
  projectId: string,
  input: { name: string; note: string; memberIds: string[] },
): Promise<Result> {
  const { db, userId, abilities } = await requireProject(orgId, projectId);
  if (!abilities.createStructure) return fail(NO_STRUCTURE);
  const name = cleanName(input?.name);
  const note = String(input?.note ?? "").replace(/\s+/g, " ").trim().slice(0, 280) || null;
  const memberIds = uuidList(input?.memberIds);
  if (!name) return fail("Give the sub-system a name.");

  const { count, error: countError } = await db.from("subsystems").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  if (countError) {
    console.error("count sub-systems failed", countError);
    return fail();
  }
  const { data: created, error } = await db
    .from("subsystems")
    .insert({ project_id: projectId, name, note, color: randomSubsystemColor(), created_by: userId, ...nextNodePosition(count ?? 0) })
    .select("id")
    .single<{ id: string }>();
  if (error || !created) {
    console.error("create sub-system failed", error);
    return fail();
  }
  if (memberIds.length > 0) {
    // The foreign key to project_members rejects anyone who isn't on the project.
    const { error: memberError } = await db
      .from("subsystem_members")
      .insert(memberIds.map((id) => ({ subsystem_id: created.id, project_id: projectId, user_id: id })));
    if (memberError) {
      console.error("assign sub-system people failed", memberError);
      await db.from("subsystems").delete().eq("id", created.id);
      return fail("One of those people isn't on this project any more. Refresh and try again.");
    }
  }
  revalidatePath(projectPath(orgId, projectId));
  return { ok: true };
}

/**
 * Connects two or more sub-systems, with people chosen from those
 * sub-systems. Leads and systems engineers.
 */
export async function createIntegration(
  orgId: string,
  projectId: string,
  input: { name: string; subsystemIds: string[]; memberIds: string[] },
): Promise<Result> {
  const { db, userId, abilities } = await requireProject(orgId, projectId);
  if (!abilities.createStructure) return fail(NO_STRUCTURE);
  const name = cleanName(input?.name);
  const subsystemIds = uuidList(input?.subsystemIds);
  const memberIds = uuidList(input?.memberIds);
  if (subsystemIds.length < 2) return fail("Choose at least two sub-systems to connect.");
  if (!name) return fail("Give the integration a name.");

  const { subsystems } = await loadStructure(db, projectId);
  if (subsystemIds.some((id) => !subsystems.some((s) => s.id === id))) {
    return fail("One of those sub-systems no longer exists. Refresh and try again.");
  }
  if (peopleOutsideSubsystems(memberIds, subsystems, subsystemIds).length > 0) {
    return fail("Everyone on an integration has to be on one of the sub-systems it connects.");
  }

  const { data: created, error } = await db
    .from("integrations")
    .insert({ project_id: projectId, name, created_by: userId })
    .select("id")
    .single<{ id: string }>();
  if (error || !created) {
    console.error("create integration failed", error);
    return fail();
  }
  const { error: linkError } = await db
    .from("integration_subsystems")
    .insert(subsystemIds.map((id) => ({ integration_id: created.id, project_id: projectId, subsystem_id: id })));
  const { error: memberError } = linkError || memberIds.length === 0
    ? { error: null }
    : await db.from("integration_members").insert(memberIds.map((id) => ({ integration_id: created.id, project_id: projectId, user_id: id })));
  if (linkError || memberError) {
    console.error("create integration links failed", linkError ?? memberError);
    await db.from("integrations").delete().eq("id", created.id);
    return fail();
  }
  revalidatePath(projectPath(orgId, projectId));
  return { ok: true };
}

/** Assigns someone on the project to a sub-system, or takes them off it. */
export async function setSubsystemMember(
  orgId: string,
  projectId: string,
  input: { subsystemId: string; userId: string; assigned: boolean },
): Promise<Result> {
  const { db, abilities } = await requireProject(orgId, projectId);
  if (!abilities.editContent) return fail(NO_EDIT);
  if (!isUuid(input?.subsystemId) || !isUuid(input?.userId)) return fail();
  const { error } = input.assigned
    ? await db.from("subsystem_members").upsert({ subsystem_id: input.subsystemId, project_id: projectId, user_id: input.userId })
    : await db.from("subsystem_members").delete().eq("project_id", projectId).eq("subsystem_id", input.subsystemId).eq("user_id", input.userId);
  if (error) {
    if (error.code === "23503") return fail("They aren't on this project any more. Refresh and try again.");
    console.error("set sub-system member failed", error);
    return fail();
  }
  revalidatePath(projectPath(orgId, projectId));
  return { ok: true };
}

// ── Documents ────────────────────────────────────────────────

const DOC_COLUMNS = "id, title, body, content, subsystem_id, integration_id, updated_at, head_version";
const SAVE_CONFLICT = "Someone else saved this document while you were editing. Copy your changes, reload, and apply them to the newest version.";

/** The drive a document goes in. A sub-system wins if both are given. */
function scopeOf(input: DocScope | undefined) {
  const subsystemId = isUuid(input?.subsystemId) ? input.subsystemId : null;
  const integrationId = !subsystemId && isUuid(input?.integrationId) ? input.integrationId : null;
  return { subsystem_id: subsystemId, integration_id: integrationId };
}

/** Starts an empty document in the project drive, or in a sub-system's or integration's drive. */
export async function createDocument(
  orgId: string,
  projectId: string,
  input: { title: string } & DocScope,
): Promise<Result<{ id: string }>> {
  const { db, userId, abilities } = await requireProject(orgId, projectId);
  if (!abilities.editContent) return fail(NO_EDIT);
  const title = cleanName(input?.title).slice(0, 160);
  if (!title) return fail("Give the document a title.");
  // Composite foreign keys reject a sub-system or integration from another project.
  const { data, error } = await db
    .from("documents")
    .insert({ project_id: projectId, ...scopeOf(input), title, created_by: userId, updated_by: userId })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    console.error("create document failed", error);
    return fail();
  }
  revalidatePath(projectPath(orgId, projectId), "layout");
  return { ok: true, id: data.id };
}

/** Moves a document to another drive. Its history moves with it. */
export async function moveDocument(orgId: string, projectId: string, input: { id: string } & DocScope): Promise<Result> {
  const { db, abilities } = await requireProject(orgId, projectId);
  if (!abilities.editContent) return fail(NO_EDIT);
  if (!isUuid(input?.id)) return fail();
  const { error } = await db.from("documents").update(scopeOf(input)).eq("project_id", projectId).eq("id", input.id);
  if (error) {
    if (error.code === "23503") return fail("That sub-system or integration no longer exists.");
    console.error("move document failed", error);
    return fail();
  }
  revalidatePath(projectPath(orgId, projectId), "layout");
  return { ok: true };
}

export async function getDocument(orgId: string, projectId: string, id: string): Promise<Result<{ document: DocFull }>> {
  const { db } = await requireProject(orgId, projectId);
  if (!isUuid(id)) return fail("That document doesn't exist.");
  const { data, error } = await db.from("documents").select(DOC_COLUMNS).eq("project_id", projectId).eq("id", id).maybeSingle<DocFull>();
  if (error) {
    console.error("get document failed", error);
    return fail();
  }
  if (!data) return fail("That document doesn't exist any more.");
  return { ok: true, document: data };
}

/**
 * Writes one new version of a document and makes it the current one.
 * The version row goes in first: its unique (document, version) key is what
 * stops two people who saved at the same moment from both winning.
 */
async function commitVersion(
  ctx: Awaited<ReturnType<typeof requireProject>>,
  projectId: string,
  v: { id: string; title: string; content: DocContent; message: string | null; baseVersion: number; restoredFrom?: number },
): Promise<Result<{ version: number; updated_at: string }>> {
  const { db, userId } = ctx;
  const { data: current, error: readError } = await db
    .from("documents")
    .select("head_version")
    .eq("project_id", projectId)
    .eq("id", v.id)
    .maybeSingle<{ head_version: number }>();
  if (readError) {
    console.error("read document head failed", readError);
    return fail();
  }
  if (!current) return fail("That document doesn't exist any more.");
  if (current.head_version !== v.baseVersion) return fail(SAVE_CONFLICT);

  const version = current.head_version + 1;
  const { error: versionError } = await db.from("document_versions").insert({
    document_id: v.id,
    project_id: projectId,
    version,
    title: v.title,
    content: v.content,
    message: v.message,
    restored_from: v.restoredFrom ?? null,
    created_by: userId,
  });
  if (versionError) {
    if (versionError.code === "23505") return fail(SAVE_CONFLICT);
    console.error("save version failed", versionError);
    return fail();
  }
  const { data, error } = await db
    .from("documents")
    .update({ title: v.title, content: v.content, body: docToText(v.content).slice(0, 200000), head_version: version, updated_by: userId })
    .eq("project_id", projectId)
    .eq("id", v.id)
    .select("updated_at")
    .maybeSingle<{ updated_at: string }>();
  if (error || !data) {
    console.error("update document failed", error);
    // Don't leave a version in the history that never became current.
    await db.from("document_versions").delete().eq("document_id", v.id).eq("version", version);
    return fail();
  }
  return { ok: true, version, updated_at: data.updated_at };
}

/** Saves the document as a new version, with an optional note about what changed. */
export async function saveDocument(
  orgId: string,
  projectId: string,
  input: { id: string; title: string; content: DocContent; message: string; baseVersion: number },
): Promise<Result<{ version: number; updated_at: string }>> {
  const ctx = await requireProject(orgId, projectId);
  if (!ctx.abilities.editContent) return fail(NO_EDIT);
  const title = cleanName(input?.title).slice(0, 160);
  const message = String(input?.message ?? "").replace(/\s+/g, " ").trim().slice(0, 200) || null;
  if (!isUuid(input?.id) || !Number.isInteger(input?.baseVersion)) return fail();
  if (!title) return fail("Give the document a title.");
  if (!isDocContent(input.content)) return fail("This document couldn't be read. Reload and try again.");
  if (JSON.stringify(input.content).length > MAX_CONTENT_CHARS) {
    return fail("This document is too large to save. Split it into smaller documents, or remove large pasted content.");
  }
  const result = await commitVersion(ctx, projectId, { id: input.id, title, content: input.content, message, baseVersion: input.baseVersion });
  if (result.ok) revalidatePath(projectPath(orgId, projectId), "layout");
  return result;
}

/** A document's saved versions, newest first, with who saved each. */
export async function listVersions(orgId: string, projectId: string, id: string): Promise<Result<{ versions: VersionMeta[] }>> {
  const { db } = await requireProject(orgId, projectId);
  if (!isUuid(id)) return fail();
  const { data, error } = await db
    .from("document_versions")
    .select("version, title, message, restored_from, created_at, created_by")
    .eq("project_id", projectId)
    .eq("document_id", id)
    .order("version", { ascending: false })
    .limit(500)
    .returns<(Omit<VersionMeta, "author"> & { created_by: string | null })[]>();
  if (error) {
    console.error("list versions failed", error);
    return fail();
  }
  const rows = data ?? [];
  const authorIds = [...new Set(rows.map((r) => r.created_by).filter((x): x is string => Boolean(x)))];
  const { data: profiles } = authorIds.length
    ? await db.from("profiles").select("id, email, full_name").in("id", authorIds).returns<{ id: string; email: string; full_name: string | null }[]>()
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
  return {
    ok: true,
    versions: rows.map(({ created_by, ...v }) => ({ ...v, author: (created_by && names.get(created_by)) || "Former member" })),
  };
}

async function readVersion(ctx: Awaited<ReturnType<typeof requireProject>>, projectId: string, id: string, version: number) {
  if (!isUuid(id) || !Number.isInteger(version) || version < 1) return null;
  const { data, error } = await ctx.db
    .from("document_versions")
    .select("title, content")
    .eq("project_id", projectId)
    .eq("document_id", id)
    .eq("version", version)
    .maybeSingle<{ title: string; content: DocContent }>();
  if (error) console.error("get version failed", error);
  return data ?? null;
}

export async function getVersion(
  orgId: string,
  projectId: string,
  input: { id: string; version: number },
): Promise<Result<{ title: string; content: DocContent }>> {
  const ctx = await requireProject(orgId, projectId);
  const found = await readVersion(ctx, projectId, input?.id, input?.version);
  return found ? { ok: true, ...found } : fail("That version couldn't be found.");
}

/**
 * Brings back an old version by saving its content again as the newest
 * version. Nothing is deleted, so a restore can itself be undone.
 */
export async function restoreVersion(
  orgId: string,
  projectId: string,
  input: { id: string; version: number; baseVersion: number },
): Promise<Result<{ version: number; updated_at: string; title: string; content: DocContent }>> {
  const ctx = await requireProject(orgId, projectId);
  if (!ctx.abilities.editContent) return fail(NO_EDIT);
  if (!Number.isInteger(input?.baseVersion)) return fail();
  const old = await readVersion(ctx, projectId, input?.id, input?.version);
  if (!old) return fail("That version couldn't be found.");
  const result = await commitVersion(ctx, projectId, {
    id: input.id,
    title: old.title,
    content: old.content,
    message: `Restored version ${input.version}`,
    baseVersion: input.baseVersion,
    restoredFrom: input.version,
  });
  if (!result.ok) return result;
  revalidatePath(projectPath(orgId, projectId), "layout");
  return { ...result, title: old.title, content: old.content };
}

/** Pins a document to a sub-system's sidebar on the canvas, or unpins it. */
export async function setPin(
  orgId: string,
  projectId: string,
  input: { subsystemId: string; documentId: string; pinned: boolean },
): Promise<Result> {
  const { db, abilities } = await requireProject(orgId, projectId);
  if (!abilities.editContent) return fail(NO_EDIT);
  if (!isUuid(input?.subsystemId) || !isUuid(input?.documentId)) return fail();
  const { error } = input.pinned
    ? await db.from("subsystem_pins").upsert({ subsystem_id: input.subsystemId, document_id: input.documentId, project_id: projectId })
    : await db.from("subsystem_pins").delete().eq("project_id", projectId).eq("subsystem_id", input.subsystemId).eq("document_id", input.documentId);
  if (error) {
    console.error("set pin failed", error);
    return fail();
  }
  revalidatePath(projectPath(orgId, projectId));
  return { ok: true };
}

// ── Bills of materials ───────────────────────────────────────

const BOM_COLUMNS = "id, subsystem_id, part_number, description, quantity, unit_cost";
const toBomItem = (row: BomItem): BomItem => ({ ...row, quantity: Number(row.quantity), unit_cost: Number(row.unit_cost) });

export async function listBom(orgId: string, projectId: string, subsystemId: string): Promise<Result<{ items: BomItem[] }>> {
  const { db } = await requireProject(orgId, projectId);
  if (!isUuid(subsystemId)) return fail();
  const { data, error } = await db
    .from("bom_items")
    .select(BOM_COLUMNS)
    .eq("project_id", projectId)
    .eq("subsystem_id", subsystemId)
    .order("created_at")
    .returns<BomItem[]>();
  if (error) {
    console.error("list bom failed", error);
    return fail();
  }
  return { ok: true, items: (data ?? []).map(toBomItem) };
}

export async function addBomItem(
  orgId: string,
  projectId: string,
  input: { subsystemId: string; partNumber: string; description: string; quantity: number; unitCost: number },
): Promise<Result<{ item: BomItem }>> {
  const { db, userId, abilities } = await requireProject(orgId, projectId);
  if (!abilities.editContent) return fail(NO_EDIT);
  const description = cleanName(input?.description).slice(0, 200);
  const partNumber = cleanName(input?.partNumber).slice(0, 80);
  const quantity = Number(input?.quantity);
  const unitCost = Number(input?.unitCost);
  if (!isUuid(input?.subsystemId)) return fail();
  if (!description) return fail("Describe the part.");
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 999999999) return fail("Enter a quantity of zero or more.");
  if (!Number.isFinite(unitCost) || unitCost < 0 || unitCost > 9999999999) return fail("Enter a unit cost of zero or more.");
  const { data, error } = await db
    .from("bom_items")
    .insert({ project_id: projectId, subsystem_id: input.subsystemId, part_number: partNumber, description, quantity, unit_cost: unitCost, created_by: userId })
    .select(BOM_COLUMNS)
    .single<BomItem>();
  if (error || !data) {
    console.error("add bom item failed", error);
    return fail();
  }
  revalidatePath(projectPath(orgId, projectId), "layout");
  return { ok: true, item: toBomItem(data) };
}

export async function deleteBomItem(orgId: string, projectId: string, id: string): Promise<Result> {
  const { db, abilities } = await requireProject(orgId, projectId);
  if (!abilities.editContent) return fail(NO_EDIT);
  if (!isUuid(id)) return fail();
  const { error } = await db.from("bom_items").delete().eq("project_id", projectId).eq("id", id);
  if (error) {
    console.error("delete bom item failed", error);
    return fail();
  }
  revalidatePath(projectPath(orgId, projectId), "layout");
  return { ok: true };
}

// ── Feedback ─────────────────────────────────────────────────

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
