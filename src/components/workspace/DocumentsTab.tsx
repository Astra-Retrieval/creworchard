"use client";

import type { DocSummary, WorkspaceApi } from "@/lib/workspace-types";
import { DocumentManager } from "./DocumentManager";

/** The Documents tab: every document in the project, labelled with the drive it's in. */
export function DocumentsTab({
  documents,
  drives,
  api,
  canEdit,
}: {
  documents: DocSummary[];
  /** Sub-systems and integrations, to name each document's drive. */
  drives: { id: string; name: string }[];
  api: WorkspaceApi;
  canEdit: boolean;
}) {
  const driveName = (d: DocSummary) => drives.find((x) => x.id === (d.subsystem_id ?? d.integration_id))?.name ?? "Project";
  return <DocumentManager documents={documents} scope={{}} scopeLabel={driveName} api={api} canEdit={canEdit} />;
}
