"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  GitPullRequest,
  KanbanSquare,
  Mic,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

type Task = { id: string; key: string; title: string; status: string };
type Project = { id: string; name: string; description: string; sprint: { name: string; tasks: Task[] } | null };
type Me = { id: string; email: string; full_name: string };
type Enrollment = { id: string; track: string; status: string };
type RecentEvent = { action: string; object_type: string; object_id: string; created_at: string };
type Progress = { total_tasks: number; started_tasks: number; completed_tasks: number; recent_events: RecentEvent[] };

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const QUICK_LINKS = [
  { href: "/board", label: "Board", icon: KanbanSquare },
  { href: "/standup", label: "Standup", icon: CalendarCheck },
  { href: "/team", label: "Team", icon: Users },
  { href: "/github", label: "GitHub", icon: GitPullRequest },
  { href: "/voice", label: "Voice", icon: Mic },
  { href: "/progression", label: "Growth", icon: TrendingUp },
];

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Me>("/api/auth/me"),
      api<Project>("/api/projects/current"),
      api<Enrollment[]>("/api/enrollments/me"),
      api<Progress>("/api/progress"),
    ])
      .then(([meData, projData, enrollments, prog]) => {
        setMe(meData);
        setProject(projData);
        setEnrolled(enrollments.length > 0);
        setProgress(prog);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>{error}. The API must be running and seeded.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!me || !project || enrolled === null) {
    return (
      <AppShell>
        <LoadingStatus label="Loading dashboard…" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-72 w-full rounded-xl lg:col-span-3" />
          <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
        </div>
      </AppShell>
    );
  }

  if (!enrolled) {
    return (
      <AppShell email={me.email}>
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Join the internship first</CardTitle>
            <CardDescription>Complete the short onboarding to enter the Applied AI Engineering team.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link href="/onboarding">Start onboarding</Link></Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const tasks = project.sprint?.tasks ?? [];
  const nextTask = tasks.find((t) => t.status === "in_progress") ?? tasks.find((t) => t.status === "todo") ?? null;
  const recentEvents = progress?.recent_events ?? [];
  const total = progress?.total_tasks ?? tasks.length;
  const done = progress?.completed_tasks ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <AppShell email={me.email}>
      {/* Compact header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Applied AI Engineering</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Welcome, {me.full_name || me.email}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{project.name} — {project.sprint?.name}</p>
        </div>
      </div>

      {/* Slim next-up banner */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Next up</p>
        {nextTask ? (
          <>
            <p className="text-sm">
              <span className="font-semibold">{nextTask.key}</span>
              <span className="text-muted-foreground"> — {nextTask.title}</span>
            </p>
            <Button size="sm" variant="default" asChild className="ml-auto h-7 text-xs">
              <Link href={`/tasks/${nextTask.id}`}>
                Open <ArrowRight size={13} aria-hidden />
              </Link>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            All caught up — every task is locked, in review, or approved.{" "}
            <Link href="/progression" className="font-medium text-primary hover:underline">View growth</Link>
          </p>
        )}
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-5">
        {/* Sprint panel */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Current sprint</CardTitle>
                <CardDescription>{done} of {total} approved</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                <Link href="/board">Board <ArrowRight size={13} aria-hidden /></Link>
              </Button>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% of sprint tasks approved`}
            >
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tasks/${t.id}`}
                    className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-muted/50"
                  >
                    <span className="truncate text-sm font-medium group-hover:underline">
                      {t.key} — {t.title}
                    </span>
                    <StatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
              {tasks.length === 0 && (
                <li className="px-2 py-4 text-sm text-muted-foreground">No sprint tasks assigned yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4 lg:col-span-2">
          {/* Stats strip */}
          <Card>
            <CardContent className="grid grid-cols-3 divide-x divide-border p-0">
              {[
                { value: progress?.total_tasks ?? "—", label: "Tasks", href: "/board" },
                { value: progress?.started_tasks ?? "—", label: "Active", href: "/progression" },
                { value: progress?.completed_tasks ?? "—", label: "Approved", href: "/roadmap" },
              ].map((s) => (
                <Link key={s.label} href={s.href} className="group px-3 py-3 text-center transition-colors duration-150 hover:bg-muted/50 first:rounded-l-xl last:rounded-r-xl">
                  <p className="text-xl font-extrabold tabular-nums leading-none">{s.value}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground group-hover:text-foreground">{s.label}</p>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardContent className="grid grid-cols-3 gap-1.5 p-3">
              {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent/60 hover:text-foreground"
                >
                  <Icon size={17} aria-hidden />
                  {label}
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {recentEvents.length === 0 ? (
                <p className="px-1 pb-1 text-sm text-muted-foreground">No recent activity yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentEvents.slice(0, 4).map((e, i) => (
                    <li key={`${e.created_at}-${i}`} className="py-2">
                      <p className="truncate text-sm font-medium">{e.action}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {e.object_type} · {formatEventTime(e.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
