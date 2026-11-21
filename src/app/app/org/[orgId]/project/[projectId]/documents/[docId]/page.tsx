import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/org-rules";
import { loadStructure, requireProject } from "@/lib/orgs";
import { workspaceApi } from "@/lib/workspace-api";
import type { DocFull, Draft } from "@/lib/workspace-types";
import { DocumentEditor } from "@/components/workspace/DocumentEditor";
import { SheetEditor } from "@/components/workspace/SheetEditor";

type Params = Promise<{ orgId: string; projectId: string; docId: string }>;

async function loadDocument(orgId: string, projectId: string, docId: string) {
  const ctx = await requireProject(orgId, projectId);
  if (!isUuid(docId)) notFound();
  const { data, error } = await ctx.db
    .from("documents")
    .select("id, kind, title, body, content, subsystem_id, integration_id, updated_at, head_version")
    .eq("project_id", projectId)
    .eq("id", docId)
    .maybeSingle<DocFull>();
  if (error) throw error;
  if (!data) notFound();
  return { ...ctx, document: data };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { orgId, projectId, docId } = await params;
  const { document } = await loadDocument(orgId, projectId, docId);
  return { title: document.title };
}

/** One document, open in the word processor, or one spreadsheet, open in the grid. */
export default async function DocumentPage({ params }: { params: Params }) {
  const { orgId, projectId, docId } = await params;
  const { db, document, abilities, userId } = await loadDocument(orgId, projectId, docId);
  const [structure, draft] = await Promise.all([
    loadStructure(db, projectId),
    // The signed-in person's own autosaved work, if they left any last time.
    abilities.editContent
      ? db.from("document_drafts").select("title, content, base_version, updated_at").eq("document_id", document.id).eq("user_id", userId).maybeSingle<Draft>()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (draft.error) throw draft.error;

  const Editor = document.kind === "sheet" ? SheetEditor : DocumentEditor;
  return (
    <Editor
      // A different document gets a fresh editor.
      key={document.id}
      document={document}
      draft={draft.data}
      drives={[
        ...structure.subsystems.map((s) => ({ kind: "subsystem" as const, id: s.id, name: s.name })),
        ...structure.integrations.map((i) => ({ kind: "integration" as const, id: i.id, name: i.name })),
      ]}
      api={workspaceApi(orgId, projectId)}
      canEdit={abilities.editContent}
      backHref={`/app/org/${orgId}/project/${projectId}/documents`}
    />
  );
}
