"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  blocked_reason: string | null;
  dependencies: { depends_on_key: string }[];
};
type Me = { email: string };

function criteriaList(raw: TaskDetail["acceptance_criteria"]): string[] {
  if (raw && Array.isArray(raw.criteria)) return raw.criteria;
  return [];
}

function CriteriaChecklist({ taskId, criteria }: { taskId: string; criteria: string[] }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`criteria:${taskId}`);
      if (raw) setChecked(JSON.parse(raw) as Record<number, boolean>);
    } catch {
      /* personal checklist only — never blocks submission */
    }
  }, [taskId]);
  function toggle(i: number) {
    setChecked((prev) => {
      const next = { ...prev, [i]: !prev[i] };
      try {
        localStorage.setItem(`criteria:${taskId}`, JSON.stringify(next));
      } catch {
        /* ignore private-mode write failures */
      }
      return next;
    });
  }
  if (criteria.length === 0) {
    return <p className="text-sm text-muted-foreground">No acceptance criteria listed.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {criteria.map((c, i) => (
        <li key={c}>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1 text-sm transition-colors hover:bg-muted/50">
            <input
              type="checkbox"
              checked={!!checked[i]}
              onChange={() => toggle(i)}
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <span className={checked[i] ? "text-muted-foreground line-through" : undefined}>{c}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

type Submission = {
  id: string;
  task_id: string;
  pr_number: number | null;
  head_sha: string | null;
  status: string;
  pr_state: string;
  source: string;
};
type LinkedRepo = { id: string; full_name: string };
type OpenPull = { number: number; title: string; head_sha: string; html_url: string };

export default function TaskPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [me, setMe] = useState<Me | null>(null);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [prUrl, setPrUrl] = useState("");
  const [headSha, setHeadSha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [repos, setRepos] = useState<LinkedRepo[] | null>(null);
  const [repoId, setRepoId] = useState<string | null>(null);
  const [pulls, setPulls] = useState<OpenPull[] | null>(null);
  const [pullsError, setPullsError] = useState<string | null>(null);
  const [selectedPull, setSelectedPull] = useState<number | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [meData, taskData, subData, ghData] = await Promise.all([
        api<Me>("/api/auth/me"),
        api<TaskDetail>(`/api/tasks/${id}`),
        api<Submission[]>("/api/submissions"),
        api<{ repos: LinkedRepo[] }>("/api/github/status").catch(() => ({ repos: [] })),
      ]);
      setMe(meData);
      setTask(taskData);
      setSubs(subData.filter((s) => s.task_id === id));
      setRepos(ghData.repos);
      setRepoId((prev) => prev ?? ghData.repos[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load task");
    }
  }, [id]);

  const loadPulls = useCallback(async (rid: string) => {
    setPulls(null);
    setPullsError(null);
    try {
      const list = await api<OpenPull[]>(`/api/github/repos/${rid}/pulls`);
      setPulls(list);
    } catch (e) {
      setPullsError(e instanceof Error ? e.message : "Could not list pull requests");
      setPulls([]);
    }
  }, []);

  useEffect(() => {
    if (repoId) loadPulls(repoId);
  }, [repoId, loadPulls]);

  function pickPull(p: OpenPull) {
    setSelectedPull(p.number);
    setPrUrl(p.html_url);
    setHeadSha(p.head_sha);
    setSubmitMsg(null);
  }

  async function submitPr() {
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const created = await api<Submission>("/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          task_id: id,
          pr_url: prUrl.trim(),
          ...(headSha.trim() ? { head_sha: headSha.trim() } : {}),
        }),
      });
      setSubs((prev) => (prev ? [created, ...prev] : [created]));
      setPrUrl("");
      setHeadSha("");
      setSubmitMsg(`PR recorded at ${created.head_sha?.slice(0, 7) ?? "unknown SHA"} — automated checks and review are running.`);
    } catch (e) {
      setSubmitMsg(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

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
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{task.title}</h1>
              <div className="mt-3"><StatusBadge status={task.status} /></div>
            </div>
            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-6">{task.description}</p></CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Acceptance criteria</CardTitle>
                <CardDescription>Checked by automated tests and review, not by hand. Tick off what you have covered.</CardDescription>
              </CardHeader>
              <CardContent>
                <CriteriaChecklist taskId={id} criteria={criteriaList(task.acceptance_criteria)} />
              </CardContent>
            </Card>
            {task.blocked_reason ? (
              <Card className="border-warning/40">
                <CardHeader><CardTitle>Blocked</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-warning">{task.blocked_reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Flagged from a confirmed standup. Clear it by making progress or updating the standup.
                  </p>
                </CardContent>
              </Card>
            ) : null}
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
            <Card>
              <CardHeader>
                <CardTitle>Submit pull request</CardTitle>
                <CardDescription>
                  Pick one of your fork&apos;s open PRs — the URL and commit SHA fill in automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {subs && subs.length > 0 ? (
                  <ul className="space-y-1.5">
                    {subs.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                        <span>
                          {s.pr_number ? `PR #${s.pr_number}` : "PR"}
                          {s.head_sha ? <span className="text-muted-foreground"> · {s.head_sha.slice(0, 7)}</span> : null}
                          <span className="text-muted-foreground"> · {s.source}</span>
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {s.status}{s.pr_state === "closed" ? " · closed" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No PRs submitted for this ticket yet.</p>
                )}
                {(repos ?? []).length > 1 ? (
                  <div className="space-y-1">
                    <label htmlFor="pr-repo" className="text-xs font-medium text-muted-foreground">Fork</label>
                    <select
                      id="pr-repo"
                      value={repoId ?? ""}
                      onChange={(e) => {
                        setRepoId(e.target.value);
                        setSelectedPull(null);
                      }}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {(repos ?? []).map((r) => (
                        <option key={r.id} value={r.id}>{r.full_name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {repoId ? (
                  pulls === null ? (
                    <Skeleton className="h-14 w-full rounded-xl" />
                  ) : pullsError ? (
                    <p role="alert" className="text-sm text-destructive">
                      {pullsError} — you can still paste a PR URL manually below.
                    </p>
                  ) : pulls.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No open PRs on this fork. Open one on GitHub first, or paste a URL manually below.
                    </p>
                  ) : (
                    <ul className="space-y-1.5" aria-label="Open pull requests on your fork">
                      {pulls.map((p) => {
                        const active = selectedPull === p.number;
                        return (
                          <li key={p.number}>
                            <button
                              type="button"
                              onClick={() => pickPull(p)}
                              aria-pressed={active}
                              className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-150 ${
                                active
                                  ? "border-primary/60 bg-primary/[0.06]"
                                  : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <span className="font-medium">
                                #{p.number} — <span className="font-normal">{p.title}</span>
                              </span>
                              <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs tabular-nums text-muted-foreground">
                                {p.head_sha.slice(0, 7)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No fork linked yet — <Link href="/github" className="font-medium text-primary hover:underline">link your fork</Link>, then pick its PR here.
                  </p>
                )}
                <details className="rounded-lg border border-border px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Or paste a PR manually
                  </summary>
                  <div className="space-y-2 pt-2">
                    <Input
                      value={prUrl}
                      onChange={(e) => {
                        setPrUrl(e.target.value);
                        setSelectedPull(null);
                      }}
                      placeholder="https://github.com/owner/repo/pull/123"
                      aria-label="Pull request URL"
                      className="w-full"
                    />
                    <Input
                      value={headSha}
                      onChange={(e) => {
                        setHeadSha(e.target.value);
                        setSelectedPull(null);
                      }}
                      placeholder="Exact commit SHA (required in manual mode)"
                      aria-label="Exact commit SHA"
                      className="w-full font-mono"
                    />
                  </div>
                </details>
                <div className="flex items-center gap-2">
                  <Button onClick={submitPr} disabled={submitting || !prUrl.trim()}>Submit PR</Button>
                  <Link href="/github" className="text-xs font-medium text-primary hover:underline">Manage repos</Link>
                </div>
                {submitMsg ? <p role="status" className="text-sm text-muted-foreground">{submitMsg}</p> : null}
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
