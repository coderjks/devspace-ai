"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    return <main className="mx-auto max-w-2xl px-6 py-16 text-sm text-muted-foreground">Loading dashboard…</main>;
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
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {me.full_name || me.email}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{project.name} — {project.sprint?.name}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>{progress?.total_tasks ?? "—"}</CardTitle><CardDescription>Sprint tasks</CardDescription></CardHeader>
            <CardContent><Button variant="outline" size="sm" asChild><Link href="/board">Open board</Link></Button></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{progress?.started_tasks ?? "—"}</CardTitle><CardDescription>In progress</CardDescription></CardHeader>
            <CardContent><Button variant="outline" size="sm" asChild><Link href="/progress">View progress</Link></Button></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{progress?.completed_tasks ?? "—"}</CardTitle><CardDescription>Approved</CardDescription></CardHeader>
            <CardContent><Button variant="outline" size="sm" asChild><Link href="/roadmap">View roadmap</Link></Button></CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Current sprint</CardTitle>
            <CardDescription>Exactly six tickets. Open one to see acceptance criteria.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {project.sprint?.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <Link href={`/tasks/${t.id}`} className="text-sm font-medium hover:underline">
                    {t.key} — {t.title}
                  </Link>
                  <span className="rounded-full border px-2 py-0.5 text-xs">{t.status}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
