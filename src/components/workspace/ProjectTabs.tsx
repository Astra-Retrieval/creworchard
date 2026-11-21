"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROJECT_SECTIONS } from "@/lib/project-rules";

/** The tabs down the left of a project: the canvas first, then each section. */
export function ProjectTabs({ projectHref }: { projectHref: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: projectHref, label: "Canvas" },
    ...PROJECT_SECTIONS.map((s) => ({ href: `${projectHref}/${s.slug}`, label: s.label })),
  ];

  return (
    <nav className="ws-tabs" aria-label="Project sections">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className="ws-tab" aria-current={pathname === t.href || (t.href !== projectHref && pathname.startsWith(`${t.href}/`)) ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
