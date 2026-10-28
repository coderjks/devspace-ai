"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";

type Task = {
  id: string;
  key: string;
  title: string;
  status: string;
  sort_order: number;
  dependencies: { depends_on_key: string }[];
};
type Sprint = { id: string; name: string; tasks: Task[] };
type Me = { email: string; full_name: string };

const COLUMNS: { status: string; title: string }[] = [
  { status: "locked", title: "Locked" },
  { status: "todo", title: "To Do" },
  { status: "in_progress", title: "In Progress" },
  { status: "in_review", title: "In Review" },
  { status: "approved", title: "Done" },
];

export default function BoardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [meData, sprintData] = await Promise.all([
        api<Me>("/api/auth/me"),
        api<Sprint>("/api/sprints/current"),
      ]);
      setMe(meData);
      setSprint(sprintData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load board");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function transition(taskId: string, to: string) {
    setBusy(taskId);
    setNotice(null);
    setError(null);
    try {
      await api(`/api/tasks/${taskId}/transitions`, {
        method: "POST",
        body: JSON.stringify({ to_status: to }),
      });
      setNotice(`Status updated to ${to.replace("_", " ")}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transition failed");
    } finally {
      setBusy(null);
    }
  }

  if (error && !sprint) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Board unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link href="/login">Go to sign in</Link></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader email={me?.email} />
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">{sprint?.name ?? "Sprint board"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status changes are enforced by the backend. Locked tasks unlock through evaluation, never by hand.
        </p>
        {notice ? <p className="mt-3 text-sm text-success">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {COLUMNS.map((col) => (
            <section key={col.status} className="rounded-lg border bg-secondary/40 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.title}</h2>
              <div className="mt-2 space-y-2">
                {(sprint?.tasks ?? [])
                  .filter((t) => t.status === col.status)
                  .map((t) => (
                    <Card key={t.id}>
                      <CardContent className="space-y-2 p-3">
                        <Link href={`/tasks/${t.id}`} className="text-sm font-medium hover:underline">
                          {t.key} — {t.title}
                        </Link>
                        {t.status === "todo" ? (
                          <Button size="sm" className="w-full" disabled={busy === t.id} onClick={() => transition(t.id, "in_progress")}>
                            Start work
                          </Button>
                        ) : null}
                        {t.status === "in_progress" ? (
                          <Button size="sm" variant="outline" className="w-full" disabled={busy === t.id} onClick={() => transition(t.id, "todo")}>
                            Move back to To Do
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                {(sprint?.tasks ?? []).filter((t) => t.status === col.status).length === 0 ? (
                  <p className="px-1 py-4 text-xs text-muted-foreground">Empty</p>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
