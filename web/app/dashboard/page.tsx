"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";

type Task = { id: string; key: string; title: string; status: string };
type Project = { id: string; name: string; description: string; sprint: { name: string; tasks: Task[] } | null };
type Me = { id: string; email: string; full_name: string };
type Enrollment = { id: string; track: string; status: string };
type Progress = { total_tasks: number; started_tasks: number; completed_tasks: number };

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
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto w-full max-w-4xl px-6 py-8">
          <LoadingStatus label="Loading dashboard…" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-2 h-5 w-80" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-6 h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (!enrolled) {
    return (
      <div className="min-h-screen">
        <SiteHeader email={me.email} />
        <main className="mx-auto max-w-2xl px-6 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Join the internship first</CardTitle>
              <CardDescription>Complete the short onboarding to enter the Applied AI Engineering team.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild><Link href="/onboarding">Start onboarding</Link></Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader email={me.email} />
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Applied AI Engineering</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Welcome, {me.full_name || me.email}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{project.name} — {project.sprint?.name}</p>

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
      </main>
    </div>
  );
}
