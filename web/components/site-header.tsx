"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/lib/api";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/board", label: "Board" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/team", label: "Team" },
  { href: "/progress", label: "Progress" },
];

export function SiteHeader({ email }: { email?: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur transition-colors duration-200">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2" aria-label="DevSpace AI dashboard">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground"
          >
            D
          </span>
          <span className="text-sm font-bold tracking-tight text-foreground">DevSpace AI</span>
        </Link>
        <nav aria-label="Workspace" className="hidden flex-wrap items-center gap-1 sm:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-all duration-150",
                  active
                    ? "bg-accent font-medium text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1.5">
          {email ? <span className="hidden text-xs text-muted-foreground lg:inline">{email}</span> : null}
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
      <nav aria-label="Workspace" className="mx-auto flex w-full max-w-5xl items-center gap-1 overflow-x-auto px-6 pb-2 sm:hidden">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors duration-150",
                active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
