import type { Metadata } from "next";
import { requireProject } from "@/lib/orgs";
import { ProjectShell } from "@/components/workspace/ProjectShell";
import { sendFeedback } from "../../../../actions";

type Params = Promise<{ orgId: string; projectId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { orgId, projectId } = await params;
  const { project } = await requireProject(orgId, projectId);
  return { title: project.name };
}

/** Wraps every page of a project in the full-screen workspace frame. */
export default async function ProjectLayout({ params, children }: { params: Params; children: React.ReactNode }) {
  const { orgId, projectId } = await params;
  const { org, project } = await requireProject(orgId, projectId);

  return (
    <ProjectShell
      orgId={org.id}
      orgName={org.name}
      projectId={project.id}
      projectName={project.name}
      sendFeedback={sendFeedback.bind(null, org.id, project.id)}
    >
      {children}
    </ProjectShell>
  );
}
