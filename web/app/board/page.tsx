"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, LayoutGrid, List, Search, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppShell } from "@/components/app-shell";
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
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"board" | "list">("board");

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

  // Client-side only: filtering never triggers API calls.
  const q = query.trim().toLowerCase();
  const visibleTasks = useMemo(() => {
    const all = sprint?.tasks ?? [];
    const filtered = q ? all.filter((t) => `${t.key} ${t.title}`.toLowerCase().includes(q)) : all;
    return [...filtered].sort((a, b) => a.sort_order - b.sort_order);
  }, [sprint, q]);

  // Shared by both views; server-side transitions stay authoritative (no drag-and-drop).
  function actionFor(t: Task, className: string) {
    if (t.status === "todo") {
      return (
        <Button size="sm" className={className} disabled={busy === t.id} onClick={() => transition(t.id, "in_progress")}>
          {busy === t.id ? "Starting…" : "Start work"}
        </Button>
      );
    }
    if (t.status === "in_progress") {
      return (
        <Button size="sm" variant="outline" className={className} disabled={busy === t.id} onClick={() => transition(t.id, "todo")}>
          {busy === t.id ? "Moving…" : "Move back to To Do"}
        </Button>
      );
    }
    return null;
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
    <AppShell email={me?.email}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Sprint 1 · Applied AI Engineering</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{sprint?.name ?? "Sprint board"}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
          Status changes are enforced by the backend. Locked tasks unlock through evaluation, never by hand.
        </p>
        {notice ? <p role="status" className="mt-3 animate-fade-in text-sm text-success">{notice}</p> : null}
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <LoadingStatus label="Loading sprint board…" /> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="board-search" className="text-xs font-medium text-muted-foreground">Search tasks</label>
            <div className="relative mt-1.5">
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="board-search"
                type="search"
                placeholder="Filter by key or title…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X size={16} aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
          <div role="group" aria-label="Board view" className="flex w-fit items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <Button size="sm" variant={view === "board" ? "secondary" : "ghost"} aria-pressed={view === "board"} onClick={() => setView("board")}>
              <LayoutGrid size={14} aria-hidden className="mr-1.5" />
              Board
            </Button>
            <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} aria-pressed={view === "list"} onClick={() => setView("list")}>
              <List size={14} aria-hidden className="mr-1.5" />
              List
            </Button>
          </div>
        </div>
        {view === "list" ? (
          <div className="mt-6 space-y-2">
            {loading
              ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
              : visibleTasks.map((t) => {
                  const action = actionFor(t, "w-full sm:w-auto");
                  return (
                    <Card key={t.id} className="transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lift">
                      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                        <StatusBadge status={t.status} />
                        <Link href={`/tasks/${t.id}`} className="flex-1 text-sm font-medium leading-5 hover:underline">
                          {t.key} — {t.title}
                        </Link>
                        {action ? <div className="shrink-0 sm:ml-auto">{action}</div> : null}
                      </CardContent>
                    </Card>
                  );
                })}
            {!loading && visibleTasks.length === 0 ? (
              (sprint?.tasks ?? []).length === 0 ? (
                <EmptyState icon={Inbox} title="No tasks here" hint="Tasks appear as evaluations unlock them." />
              ) : (
                <EmptyState icon={SearchX} title="No matching tasks" hint="Try a different search." />
              )
            ) : null}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {COLUMNS.map((col) => {
              const tasks = visibleTasks.filter((t) => t.status === col.status);
              const total = (sprint?.tasks ?? []).filter((t) => t.status === col.status).length;
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
                              {actionFor(t, "w-full")}
                            </CardContent>
                          </Card>
                        ))}
                    {!loading && tasks.length === 0 ? (
                      total === 0 ? (
                        <EmptyState icon={Inbox} title="No tasks here" hint="Tasks appear as evaluations unlock them." />
                      ) : (
                        <EmptyState icon={SearchX} title="No matching tasks" hint="No tasks in this column match your search." />
                      )
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        )}
    </AppShell>
  );
}
