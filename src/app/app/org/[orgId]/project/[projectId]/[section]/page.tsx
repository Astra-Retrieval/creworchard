import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProjectSection } from "@/lib/org-rules";
import { requireProject } from "@/lib/orgs";

type Params = Promise<{ orgId: string; projectId: string; section: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { section } = await params;
  return { title: findProjectSection(section)?.label };
}

/**
 * One of a project's left-hand tabs (documents, requirements, constraints).
 * Each is an empty page for now; the list lives in PROJECT_SECTIONS.
 */
export default async function ProjectSectionPage({ params }: { params: Params }) {
  const { orgId, projectId, section: slug } = await params;
  const section = findProjectSection(slug);
  if (!section) notFound();
  const { project } = await requireProject(orgId, projectId);

  return (
    <div className="ws-section">
      <p className="eyebrow">{project.name}</p>
      <h1>{section.label}</h1>
      <p className="lede">{section.blurb}</p>
      <div className="ws-section-empty">Nothing here yet.</div>
    </div>
  );
}
