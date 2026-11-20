"use client";

import { usePathname } from "next/navigation";

/** Project pages are a full-screen workspace with their own navigation. */
const WORKSPACE_ROUTE = /^\/app\/org\/[^/]+\/project\//;

/**
 * Wraps the site's header and footer so they step aside inside a project,
 * where the workspace fills the whole window.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (WORKSPACE_ROUTE.test(pathname)) return null;
  return <>{children}</>;
}
