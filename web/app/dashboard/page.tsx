"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
type TeamMember = { id: string; name: string; role: string; responsibilities: string; kind: string };
type Team = { members: TeamMember[] };

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
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
    api<Team>("/api/team")
      .then(setTeam)
      .catch(() => setTeam({ members: [] }));
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
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-2 h-5 w-80" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-6 h-64 w-full rounded-xl" />
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

  return (
    <AppShell email={me.email}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Applied AI Engineering</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Welcome, {me.full_name || me.email}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{project.name} — {project.sprint?.name}</p>

        <Card className="mt-6 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lift">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Next recommended action</p>
            {nextTask ? (
              <>
                <CardTitle className="mt-1">{nextTask.key} — {nextTask.title}</CardTitle>
                <CardDescription>
                  {nextTask.status === "in_progress" ? "Continue where you left off." : "Ready to start."}
                </CardDescription>
              </>
            ) : tasks.length > 0 ? (
              <>
                <CardTitle className="mt-1">All caught up</CardTitle>
                <CardDescription>Every sprint task is locked, in review, or approved. Review your overall progress.</CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="mt-1">No sprint tasks yet</CardTitle>
                <CardDescription>Your sprint has no tasks assigned. Check back after onboarding completes.</CardDescription>
              </>
            )}
          </CardHeader>
          {(nextTask || tasks.length > 0) && (
            <CardContent>
              {nextTask ? (
                <Button size="sm" asChild>
                  <Link href={`/tasks/${nextTask.id}`}>
                    Open {nextTask.key} <ArrowRight size={14} aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button size="sm" asChild>
                  <Link href="/progress">
                    View progress <ArrowRight size={14} aria-hidden />
                  </Link>
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lift">
            <CardHeader><CardTitle className="text-3xl font-extrabold tabular-nums">{progress?.total_tasks ?? "—"}</CardTitle><CardDescription>Sprint tasks</CardDescription></CardHeader>
            <CardContent><Button variant="outline" size="sm" asChild><Link href="/board">Open board <ArrowRight size={14} aria-hidden /></Link></Button></CardContent>
          </Card>
          <Card className="transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lift">
            <CardHeader><CardTitle className="text-3xl font-extrabold tabular-nums">{progress?.started_tasks ?? "—"}</CardTitle><CardDescription>In progress</CardDescription></CardHeader>
            <CardContent><Button variant="outline" size="sm" asChild><Link href="/progress">View progress <ArrowRight size={14} aria-hidden /></Link></Button></CardContent>
          </Card>
          <Card className="transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lift">
            <CardHeader><CardTitle className="text-3xl font-extrabold tabular-nums">{progress?.completed_tasks ?? "—"}</CardTitle><CardDescription>Approved</CardDescription></CardHeader>
            <CardContent><Button variant="outline" size="sm" asChild><Link href="/roadmap">View roadmap <ArrowRight size={14} aria-hidden /></Link></Button></CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Current sprint</CardTitle>
            <CardDescription>Exactly six tickets. Open one to see acceptance criteria.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {project.sprint?.tasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tasks/${t.id}`}
                    className="group flex items-center justify-between gap-3 rounded-lg py-3 transition-colors duration-150 hover:bg-muted/50"
                  >
                    <span className="text-sm font-medium group-hover:underline">
                      {t.key} — {t.title}
                    </span>
                    <StatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Your latest recorded actions.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentEvents.slice(0, 5).map((e, i) => (
                    <li key={`${e.created_at}-${i}`} className="py-2.5">
                      <p className="text-sm font-medium">{e.action}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        {e.object_type} · {e.object_id} · {formatEventTime(e.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your teammates</CardTitle>
              <CardDescription>Five AI teammates plus your learning assistant.</CardDescription>
            </CardHeader>
            <CardContent>
              {team === null ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ) : team.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Team directory is unavailable right now.</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {team.members.map((m) => (
                      <li key={m.id}>
                        <Link
                          href="/team"
                          className="group flex items-baseline justify-between gap-3 rounded-lg px-1 py-1 transition-colors duration-150 hover:bg-muted/50"
                        >
                          <span className="text-sm font-medium group-hover:underline">{m.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{m.role}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" asChild className="mt-4">
                    <Link href="/team">Meet the team <ArrowRight size={14} aria-hidden /></Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Coming next</CardTitle>
            <CardDescription>Planned phases, not yet available.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              <li className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 opacity-60" aria-disabled="true">
                <p className="text-sm font-semibold">Daily standups</p>
                <p className="mt-1 text-xs text-muted-foreground">Daily standups arrive in Phase 04.</p>
              </li>
              <li className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 opacity-60" aria-disabled="true">
                <p className="text-sm font-semibold">GitHub connection</p>
                <p className="mt-1 text-xs text-muted-foreground">GitHub connection arrives in Phase 05.</p>
              </li>
            </ul>
          </CardContent>
        </Card>
    </AppShell>
  );
}
