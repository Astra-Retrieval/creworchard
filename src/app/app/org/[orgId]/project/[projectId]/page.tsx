import { loadCanvas } from "@/lib/orgs";
import { Canvas } from "@/components/workspace/Canvas";
import { createIntegration, createSubsystem } from "../../../../actions";

/** A project's main page: the canvas. */
export default async function ProjectCanvasPage({ params }: { params: Promise<{ orgId: string; projectId: string }> }) {
  const { orgId, projectId } = await params;
  const { subsystems, integrations } = await loadCanvas(orgId, projectId);

  return (
    <Canvas
      subsystems={subsystems}
      integrations={integrations}
      createSubsystem={createSubsystem.bind(null, orgId, projectId)}
      createIntegration={createIntegration.bind(null, orgId, projectId)}
    />
  );
}
