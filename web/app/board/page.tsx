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
  blocked_reason: string | null;
  dependencies: { depends_on_key: string }[];
};
type Sprint = { id: string; name: string; tasks: Task[] };
type Me = { email: string; full_name: string };
type Submission = { id: string; task_key: string | null };

/**
 * Per-status ticket colors: a left accent stripe + faint wash on the card and
 * a matching dot on the column header. Restrained by design — color supports
 * the status badge, never replaces it.
 */
const STATUS_ACCENT: Record<string, { bar: string; wash: string; dot: string }> = {
  locked: { bar: "border-l-muted-foreground/30", wash: "bg-muted/30", dot: "bg-muted-foreground/60" },
  todo: { bar: "border-l-info/70", wash: "bg-info/[0.05]", dot: "bg-info" },
  in_progress: { bar: "border-l-primary/70", wash: "bg-primary/[0.05]", dot: "bg-primary" },
  in_review: { bar: "border-l-warning/70", wash: "bg-warning/[0.06]", dot: "bg-warning" },
  approved: { bar: "border-l-success/70", wash: "bg-success/[0.05]", dot: "bg-emerald-500" },
  blocked: { bar: "border-l-destructive/70", wash: "bg-destructive/[0.05]", dot: "bg-destructive" },
};

function statusAccent(status: string): { bar: string; wash: string; dot: string } {
  return STATUS_ACCENT[status] ?? STATUS_ACCENT.locked;
}

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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [reportByTaskKey, setReportByTaskKey] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [meData, sprintData, subs] = await Promise.all([
        api<Me>("/api/auth/me"),
        api<Sprint>("/api/sprints/current"),
        api<Submission[]>("/api/submissions").catch(() => [] as Submission[]),
      ]);
      setMe(meData);
      setSprint(sprintData);
      const byKey: Record<string, string> = {};
      for (const s of subs) {
        if (s.task_key && !(s.task_key in byKey)) byKey[s.task_key] = s.id;
      }
      setReportByTaskKey(byKey);
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

  // Drag-and-drop targets: only todo <-> in_progress moves are legal server-side.
  // Drops anywhere else are refused (the card snaps back on reload).
  const DROP_COLUMNS = useMemo(() => new Set(["todo", "in_progress"]), []);
  const draggedTask = useMemo(
    () => (sprint?.tasks ?? []).find((t) => t.id === draggingId) ?? null,
    [sprint, draggingId]
  );
  function canDropOn(status: string): boolean {
    return (
      draggedTask !== null &&
      DROP_COLUMNS.has(status) &&
      DROP_COLUMNS.has(draggedTask.status) &&
      draggedTask.status !== status &&
      busy === null
    );
  }

  // Shared by both views; server-side transitions stay authoritative.
  // Card buttons remain as the keyboard/touch alternative to dragging.
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
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{sprint?.name ?? "Sprint board"}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
          Drag cards between To Do and In Progress. The other columns update on their own as your work is reviewed.
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
                  const accent = statusAccent(t.status);
                  return (
                    <Card key={t.id} data-status={t.status} className={`border-l-4 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lift ${accent.bar} ${accent.wash}`}>
                      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                        <StatusBadge status={t.status} />
                        <Link href={`/tasks/${t.id}`} className="flex-1 text-sm font-medium leading-5 hover:underline">
                          {t.key} — {t.title}
                          {t.blocked_reason ? <span className="ml-2 text-xs font-normal text-warning">(blocked)</span> : null}
                        </Link>
                        {reportByTaskKey[t.key] ? (
                          <Link href={`/submissions/${reportByTaskKey[t.key]}`} className="shrink-0 text-xs font-medium text-primary hover:underline">
                            Review report
                          </Link>
                        ) : null}
                        {action ? <div className="shrink-0 sm:ml-auto">{action}</div> : null}
                      </CardContent>
                    </Card>
                  );
                })}
            {!loading && visibleTasks.length === 0 ? (
              (sprint?.tasks ?? []).length === 0 ? (
                <EmptyState icon={Inbox} title="No tasks here" hint="Tasks appear here as your work is approved." />
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
              const droppable = canDropOn(col.status);
              const isTarget = droppable && dropTarget === col.status;
              const dimmed = draggingId !== null && !droppable;
              return (
                <section
                  key={col.status}
                  aria-label={`${col.title} column`}
                  aria-disabled={dimmed || undefined}
                  onDragOver={(e) => {
                    if (canDropOn(col.status)) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDropTarget(col.status);
                    }
                  }}
                  onDragLeave={() => setDropTarget((cur) => (cur === col.status ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropTarget(null);
                    if (draggingId && canDropOn(col.status)) {
                      const id = draggingId;
                      setDraggingId(null);
                      transition(id, col.status);
                    }
                  }}
                  className={`rounded-2xl border p-3 transition-all duration-150 ${
                    isTarget
                      ? "border-primary/60 bg-primary/[0.07]"
                      : droppable
                        ? "border-dashed border-primary/30 bg-muted/40"
                        : dimmed
                          ? "border-border bg-muted/40 opacity-50 saturate-50"
                          : "border-border bg-muted/40"
                  }`}
                >
                  <h2 className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className={`h-2 w-2 rounded-full ${statusAccent(col.status).dot}`} />
                      {col.title}
                    </span>
                    <span aria-hidden className="rounded-full bg-background px-1.5 py-0.5 text-[11px] tabular-nums">
                      {loading ? "–" : tasks.length}
                    </span>
                  </h2>
                  <div className="mt-2 min-h-16 space-y-2">
                    {loading
                      ? [0, 1].map((i) => <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />)
                      : tasks.map((t) => {
                          const draggable = DROP_COLUMNS.has(t.status) && busy === null;
                          const isDragging = draggingId === t.id;
                          const accent = statusAccent(t.status);
                          return (
                          <Card
                            key={t.id}
                            draggable={draggable}
                            data-status={t.status}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", t.id);
                              e.dataTransfer.effectAllowed = "move";
                              setDraggingId(t.id);
                            }}
                            onDragEnd={() => {
                              setDraggingId(null);
                              setDropTarget(null);
                            }}
                            className={`border-l-4 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lift ${accent.bar} ${accent.wash} ${
                              isDragging ? "opacity-40" : ""
                            } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
                          >
                            <CardContent className="space-y-2 p-3">
                              <Link href={`/tasks/${t.id}`} className="text-sm font-medium leading-5 hover:underline">
                                {t.key} — {t.title}
                              </Link>
                              {reportByTaskKey[t.key] ? (
                                <Link href={`/submissions/${reportByTaskKey[t.key]}`} className="block text-xs font-medium text-primary hover:underline">
                                  Review report
                                </Link>
                              ) : null}
                              {t.blocked_reason ? (
                                <p className="rounded-md bg-warning/15 px-2 py-1 text-xs text-warning">
                                  Blocked: {t.blocked_reason}
                                </p>
                              ) : null}
                              {actionFor(t, "w-full")}
                            </CardContent>
                          </Card>
                          );
                        })}
                    {!loading && tasks.length === 0 ? (
                      <div
                        aria-hidden
                        className={`flex min-h-20 items-center justify-center rounded-xl border border-dashed px-2 py-4 text-center text-xs text-muted-foreground ${
                          droppable ? "border-primary/40 bg-primary/[0.04]" : "border-border"
                        }`}
                      >
                        {droppable ? "Drop here" : total === 0 ? "Empty" : "No match"}
                      </div>
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
