import type { Metadata } from "next";
import { listDocuments, loadStructure, requireProject } from "@/lib/orgs";
import { workspaceApi } from "@/lib/workspace-api";
import { DocumentList } from "@/components/workspace/DocumentList";

export const metadata: Metadata = { title: "Documents" };

/**
 * The project drive: every document in the project, wherever it was saved.
 * A document saved in a sub-system or integration shows here too.
 */
export default async function DocumentsPage({ params }: { params: Promise<{ orgId: string; projectId: string }> }) {
  const { orgId, projectId } = await params;
  const { db, project, abilities } = await requireProject(orgId, projectId);
  const [documents, structure] = await Promise.all([listDocuments(db, projectId), loadStructure(db, projectId)]);

  return (
    <div className="ws-section ws-section-wide">
      <p className="eyebrow">{project.name}</p>
      <h1>Documents</h1>
      <p className="lede">
        Everything written in this project. A document saved in an integration also appears in each
        sub-system it connects, and everything appears here in the project drive.
      </p>
      <DocumentList
        documents={documents}
        drives={[
          ...structure.subsystems.map((s) => ({ kind: "subsystem" as const, id: s.id, name: s.name })),
          ...structure.integrations.map((i) => ({ kind: "integration" as const, id: i.id, name: i.name })),
        ]}
        documentsHref={`/app/org/${orgId}/project/${projectId}/documents`}
        api={workspaceApi(orgId, projectId)}
        canEdit={abilities.editContent}
        empty="No documents yet."
      />
    </div>
  );
}
