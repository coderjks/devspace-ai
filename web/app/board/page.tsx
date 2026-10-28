"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
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

  const loading = !sprint && !error;

  return (
    <div className="min-h-screen">
      <SiteHeader email={me?.email} />
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Sprint 1 · Applied AI Engineering</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{sprint?.name ?? "Sprint board"}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
          Status changes are enforced by the backend. Locked tasks unlock through evaluation, never by hand.
        </p>
        {notice ? <p role="status" className="mt-3 animate-fade-in text-sm text-success">{notice}</p> : null}
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <LoadingStatus label="Loading sprint board…" /> : null}
        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {COLUMNS.map((col) => {
            const tasks = (sprint?.tasks ?? []).filter((t) => t.status === col.status);
            return (
              <section key={col.status} aria-label={`${col.title} column`} className="rounded-2xl border border-border bg-muted/40 p-3">
                <h2 className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {col.title}
                  <span aria-hidden className="rounded-full bg-background px-1.5 py-0.5 text-[11px] tabular-nums">
                    {loading ? "–" : tasks.length}
                  </span>
                </h2>
                <div className="mt-2 space-y-2">
                  {loading
                    ? [0, 1].map((i) => <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />)
                    : tasks.map((t) => (
                        <Card key={t.id} className="transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lift">
                          <CardContent className="space-y-2 p-3">
                            <Link href={`/tasks/${t.id}`} className="text-sm font-medium leading-5 hover:underline">
                              {t.key} — {t.title}
                            </Link>
                            {t.status === "todo" ? (
                              <Button size="sm" className="w-full" disabled={busy === t.id} onClick={() => transition(t.id, "in_progress")}>
                                {busy === t.id ? "Starting…" : "Start work"}
                              </Button>
                            ) : null}
                            {t.status === "in_progress" ? (
                              <Button size="sm" variant="outline" className="w-full" disabled={busy === t.id} onClick={() => transition(t.id, "todo")}>
                                {busy === t.id ? "Moving…" : "Move back to To Do"}
                              </Button>
                            ) : null}
                          </CardContent>
                        </Card>
                      ))}
                  {!loading && tasks.length === 0 ? (
                    <EmptyState icon={Inbox} title="No tasks here" hint="Tasks appear as evaluations unlock them." />
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
