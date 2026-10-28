"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppShell } from "@/components/app-shell";
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

export default function TaskPage({ params }: { params: { id: string } }) {
  const { id } = params;
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
    <AppShell email={me?.email}>
        <div className="mx-auto w-full max-w-3xl">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/board"><ArrowLeft size={15} aria-hidden /> Back to board</Link>
        </Button>
        {error && !task ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
        {!task && !error ? (
          <div className="mt-4 space-y-4">
            <LoadingStatus label="Loading task…" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : null}
        {task ? (
          <div className="mt-4 space-y-4 animate-fade-in">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{task.sprint_name} · {task.key}</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{task.title}</h1>
              <div className="mt-3"><StatusBadge status={task.status} /></div>
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
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
        </div>
    </AppShell>
  );
}
