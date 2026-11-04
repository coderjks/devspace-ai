"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarCheck,
  Compass,
  Github,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Trophy,
  CircleHelp,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, logout } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { PRODUCT_TOUR_EVENT, ProductTour } from "@/components/product-tour";

// Workflow order: home → work → daily rituals → collaborate → submit →
// review results → curriculum reference. Utility links live below the divider.
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/board", label: "Board", icon: KanbanSquare },
  { href: "/standup", label: "Standup", icon: CalendarCheck },
  { href: "/team", label: "Team", icon: Users },
  { href: "/github", label: "GitHub", icon: Github },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/progression", label: "Growth", icon: Trophy },
  { href: "/roadmap", label: "Roadmap", icon: Map },
];

const SECONDARY_NAV = [{ href: "/help", label: "Help", icon: CircleHelp }];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  // Task detail pages belong to the board section.
  if (href === "/board" && pathname.startsWith("/tasks/")) return true;
  return false;
}

function SidebarContent({ email, onNavigate }: { email?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2 px-2 py-1"
        aria-label="DevSpace AI dashboard"
      >
        <Logo size="md" />
        <span className="text-sm font-bold tracking-tight">DevSpace AI</span>
      </Link>
      <nav aria-label="Workspace" className="mt-6 flex-1 space-y-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              data-tour={`nav-${item.href.slice(1)}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon size={17} aria-hidden className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border px-3 pt-4">
        {SECONDARY_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              data-tour={`nav-${item.href.slice(1)}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon size={17} aria-hidden className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new Event(PRODUCT_TOUR_EVENT));
            onNavigate?.();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent/60 hover:text-foreground"
        >
          <Compass size={17} aria-hidden className="shrink-0" />
          Product tour
        </button>
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent/60 hover:text-foreground"
        >
          <User size={17} aria-hidden className="shrink-0" />
          Profile
        </Link>
      </div>
    </div>
  );
}

function ProviderDot() {
  const [mock, setMock] = useState<boolean | null>(null);
  const [model, setModel] = useState("");
  useEffect(() => {
    let cancelled = false;
    api<{ mock: boolean; model: string }>("/api/agents/provider")
      .then((s) => {
        if (!cancelled) {
          setMock(s.mock);
          setModel(s.model);
        }
      })
      .catch(() => {
        if (!cancelled) setMock(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  if (mock === null) return null;
  return (
    <span
      title={mock ? "Mock teammate replies (no live model)" : `Live model: ${model}`}
      aria-label={mock ? "Mock model mode" : `Live model ${model}`}
      className={`inline-block h-2 w-2 rounded-full ${mock ? "bg-amber-500" : "bg-emerald-500"}`}
    />
  );
}

export function AppShell({ email, children }: { email?: string; children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:block">
        <SidebarContent email={email} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-foreground/40 animate-fade-in"
          />
          <aside
            id={drawerId}
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground shadow-lift"
          >
            <div className="mb-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
                <X size={17} aria-hidden />
              </Button>
            </div>
            <SidebarContent email={email} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col md:pl-60">
        {/* Slim topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur transition-colors duration-200">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setDrawerOpen((o) => !o)}
                aria-expanded={drawerOpen}
                aria-controls={drawerId}
                aria-label="Toggle navigation"
              >
                {drawerOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
              </Button>
              <Link href="/dashboard" className="flex items-center gap-2 md:hidden" aria-label="DevSpace AI dashboard">
                <Logo size="sm" />
                <span className="text-sm font-bold tracking-tight">DevSpace AI</span>
              </Link>
            </div>
            <div className="flex items-center gap-1.5">
              {email ? (
                <span className="hidden max-w-56 truncate text-xs text-muted-foreground sm:inline" title={email}>
                  {email}
                </span>
              ) : null}
              <span className="flex items-center px-1">
                <ProviderDot />
              </span>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                aria-label="Log out"
                title="Log out"
                className="gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <LogOut size={15} aria-hidden />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Full-width content area */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
      <ProductTour email={email} />
    </div>
  );
}
