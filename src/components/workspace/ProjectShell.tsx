import Link from "next/link";
import type { FormState } from "@/app/waitlist/actions";
import { Logo } from "@/components/Logo";
import { ProjectDock } from "./ProjectDock";
import { ProjectTabs } from "./ProjectTabs";

/**
 * The full-screen frame around every project page: tabs down the left, the
 * page itself in the middle, and the shortcut row in the bottom right. The
 * site's header and footer are hidden while this is on screen (SiteChrome).
 */
export function ProjectShell({
  orgId,
  orgName,
  projectId,
  projectName,
  sendFeedback,
  children,
}: {
  orgId: string;
  orgName: string;
  projectId: string;
  projectName: string;
  sendFeedback: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
}) {
  const orgHref = `/app/org/${orgId}`;
  const projectHref = `${orgHref}/project/${projectId}`;

  return (
    <div className="ws">
      <aside className="ws-rail">
        <Link href={orgHref} className="ws-brand" aria-label={`Back to ${orgName}`}>
          <Logo size={26} wordSize={11} />
        </Link>
        <div className="ws-project">
          <span className="ws-project-org">{orgName}</span>
          <span className="ws-project-name">{projectName}</span>
        </div>
        <ProjectTabs projectHref={projectHref} />
      </aside>
      <div className="ws-main">{children}</div>
      <ProjectDock orgHref={orgHref} sendFeedback={sendFeedback} />
    </div>
  );
}
