"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE } from "@/lib/utils";

type Task = { id: string; key: string; title: string; status: string; dependencies: { depends_on_key: string }[] };
type Project = { id: string; name: string; description: string; sprint: { name: string; tasks: Task[] } | null };
type Me = { id: string; email: string; full_name: string };

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("devspace_token");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      fetch(`${API_BASE}/api/auth/me`, { headers, credentials: "include" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not signed in")))),
      fetch(`${API_BASE}/api/projects/current`, { headers, credentials: "include" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("No project")))),
    ])
      .then(([meData, projData]) => {
        setMe(meData);
        setProject(projData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function logout() {
    const token = localStorage.getItem("devspace_token");
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => undefined);
    localStorage.removeItem("devspace_token");
    window.location.href = "/login";
  }

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

  if (!me || !project) {
    return <main className="mx-auto max-w-2xl px-6 py-16 text-sm text-muted-foreground">Loading dashboard…</main>;
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {me.full_name || me.email}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.name} — {project.sprint?.name}</p>
        </div>
        <Button variant="outline" onClick={logout}>Log out</Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sprint board (persisted)</CardTitle>
          <CardDescription>Exactly six tickets. Full Kanban and task detail arrive in Phase 02.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {project.sprint?.tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{t.key} — {t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.dependencies.length ? `Depends on ${t.dependencies.map((d) => d.depends_on_key).join(", ")}` : "No dependencies"}
                  </p>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-xs">{t.status}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
