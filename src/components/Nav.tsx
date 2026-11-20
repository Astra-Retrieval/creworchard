"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

export function Nav({ signedIn, isAdmin, showApp = false }: { signedIn: boolean; isAdmin: boolean; showApp?: boolean }) {
  const pathname = usePathname();
  const tabs = [
    ...(showApp ? [{ href: "/app", label: "App" }] : []),
    { href: "/", label: "Home" },
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/waitlist", label: "Waitlist" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
    signedIn ? { href: "/account", label: "Account" } : { href: "/signin", label: "Sign in" },
  ];

  return (
    <header className="site-header">
      <nav className="container nav" aria-label="Main">
        <Link href="/" className="brand-link" aria-label="Crew Orchard home">
          <Logo />
        </Link>
        <div className="tabs" role="list">
          {tabs.map((t) => {
            const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                role="listitem"
                className="tab"
                aria-current={active ? "page" : undefined}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        <Link href="/waitlist" className="btn btn-primary nav-cta">
          Join waitlist
        </Link>
      </nav>
    </header>
  );
}
