"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/dashboard" className="text-sm font-bold tracking-tight">
          DevSpace AI
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                pathname === l.href ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-accent"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {email ? <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span> : null}
          <Button variant="outline" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
