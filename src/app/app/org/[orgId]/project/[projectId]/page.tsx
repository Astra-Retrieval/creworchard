import { loadWorkspace } from "@/lib/orgs";
import { workspaceApi } from "@/lib/workspace-api";
import { Canvas } from "@/components/workspace/Canvas";

/** A project's main page: the canvas. */
export default async function ProjectCanvasPage({ params }: { params: Promise<{ orgId: string; projectId: string }> }) {
  const { orgId, projectId } = await params;
  const workspace = await loadWorkspace(orgId, projectId);
  return <Canvas {...workspace} api={workspaceApi(orgId, projectId)} />;
}
