"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { isToday } from "@/lib/activity-feed";

type Task = { id: string; key: string; title: string; status: string };
type Project = { id: string; name: string; description: string; sprint: { name: string; tasks: Task[] } | null };
type Me = { id: string; email: string; full_name: string };
type Enrollment = { id: string; track: string; status: string };
type RecentEvent = { action: string; object_type: string; object_id: string; created_at: string };
type Progress = { total_tasks: number; started_tasks: number; completed_tasks: number; recent_events: RecentEvent[] };
type Standup = { id: string; status: string; created_at: string };
type Submission = { id: string; task_key: string | null };

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [standupDone, setStandupDone] = useState<boolean | null>(null);
  const [prCount, setPrCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Me>("/api/auth/me"),
      api<Project>("/api/projects/current"),
      api<Enrollment[]>("/api/enrollments/me"),
      api<Progress>("/api/progress"),
      api<Standup[]>("/api/standups").catch(() => [] as Standup[]),
      api<Submission[]>("/api/submissions").catch(() => [] as Submission[]),
    ])
      .then(([meData, projData, enrollments, prog, standups, subs]) => {
        setMe(meData);
        setProject(projData);
        setEnrolled(enrollments.length > 0);
        setProgress(prog);
        setStandupDone(standups.some((s) => s.status === "confirmed" && isToday(s.created_at)));
        setPrCount(subs.length);
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
  const total = progress?.total_tasks ?? tasks.length;
  const done = progress?.completed_tasks ?? 0;
  const active = progress?.started_tasks ?? 0;
  const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <AppShell email={me.email}>
      {/* Compact header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Applied AI Engineering</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Welcome, {me.full_name || me.email}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{project.name} — {project.sprint?.name}</p>
        </div>
        {standupDone === true ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} aria-hidden /> Standup done
          </span>
        ) : standupDone === false ? (
          <Button size="sm" asChild>
            <Link href="/standup">
              Write today&apos;s standup <ArrowRight size={14} aria-hidden />
            </Link>
          </Button>
        ) : null}
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
              className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={donePct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${donePct}% approved, ${activePct}% in progress`}
            >
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${donePct}%` }} />
              <div className="h-full rounded-full bg-primary/35 transition-all duration-300" style={{ width: `${activePct}%` }} />
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
          {/* Today checklist */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Today</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/standup"
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-muted/50"
                  >
                    {standupDone ? (
                      <CheckCircle2 size={16} aria-hidden className="shrink-0 text-emerald-500" />
                    ) : (
                      <CircleDashed size={16} aria-hidden className="shrink-0 text-muted-foreground" />
                    )}
                    <span className={standupDone ? "text-muted-foreground" : "font-medium"}>
                      {standupDone ? "Standup confirmed" : "Write today's standup"}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={nextTask ? `/tasks/${nextTask.id}` : "/progression"}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-muted/50"
                  >
                    {nextTask ? (
                      <CircleDashed size={16} aria-hidden className="shrink-0 text-muted-foreground" />
                    ) : (
                      <CheckCircle2 size={16} aria-hidden className="shrink-0 text-emerald-500" />
                    )}
                    <span className={nextTask ? "font-medium" : "text-muted-foreground"}>
                      {nextTask ? `Continue ${nextTask.key}` : "All caught up"}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/github"
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-muted/50"
                  >
                    {prCount !== null && prCount > 0 ? (
                      <CheckCircle2 size={16} aria-hidden className="shrink-0 text-emerald-500" />
                    ) : (
                      <CircleDashed size={16} aria-hidden className="shrink-0 text-muted-foreground" />
                    )}
                    <span className={prCount !== null && prCount > 0 ? "text-muted-foreground" : "font-medium"}>
                      {prCount !== null && prCount > 0 ? `${prCount} PR${prCount === 1 ? "" : "s"} submitted` : "Submit your first PR"}
                    </span>
                  </Link>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Growth snapshot link — stats and full history live on the Growth page */}
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold">Growth snapshot</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {done} of {total} approved{active > 0 ? ` · ${active} in progress` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild className="h-7 shrink-0 text-xs">
                <Link href="/progression">
                  View growth <ArrowRight size={13} aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
