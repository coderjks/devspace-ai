"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";

type TaskDetail = {
  id: string;
  key: string;
  title: string;
  description: string;
  acceptance_criteria: { criteria?: string[] };
  status: string;
  sprint_name: string;
  dependencies: { depends_on_key: string }[];
};
type Me = { email: string };

function criteriaList(raw: TaskDetail["acceptance_criteria"]): string[] {
  if (raw && Array.isArray(raw.criteria)) return raw.criteria;
  return [];
}

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [me, setMe] = useState<Me | null>(null);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [meData, taskData] = await Promise.all([api<Me>("/api/auth/me"), api<TaskDetail>(`/api/tasks/${id}`)]);
      setMe(meData);
      setTask(taskData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load task");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function transition(to: string) {
    setBusy(true);
    setError(null);
    try {
      const updated = await api<TaskDetail>(`/api/tasks/${id}/transitions`, {
        method: "POST",
        body: JSON.stringify({ to_status: to }),
      });
      setTask(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transition failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader email={me?.email} />
      <main className="mx-auto w-full max-w-3xl px-6 py-8">
        <Button variant="ghost" size="sm" asChild><Link href="/board">← Back to board</Link></Button>
        {error && !task ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {task ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{task.sprint_name} · {task.key}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">{task.title}</h1>
              <span className="mt-2 inline-block rounded-full border px-2 py-0.5 text-xs">{task.status}</span>
            </div>
            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-6">{task.description}</p></CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Acceptance criteria</CardTitle>
                <CardDescription>Checked by automated tests and review, not by hand.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {criteriaList(task.acceptance_criteria).map((c) => <li key={c}>{c}</li>)}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Dependencies</CardTitle></CardHeader>
              <CardContent>
                {task.dependencies.length ? (
                  <p className="text-sm">Requires {task.dependencies.map((d) => d.depends_on_key).join(", ")}.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No dependencies — start here.</p>
                )}
              </CardContent>
            </Card>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              {task.status === "todo" ? (
                <Button onClick={() => transition("in_progress")} disabled={busy}>Start work</Button>
              ) : null}
              {task.status === "in_progress" ? (
                <Button variant="outline" onClick={() => transition("todo")} disabled={busy}>Move back to To Do</Button>
              ) : null}
              {task.status === "locked" ? (
                <p className="text-sm text-muted-foreground">Locked until prerequisites are approved through evaluation.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
