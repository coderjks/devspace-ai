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

type Submission = {
  id: string;
  task_id: string;
  pr_number: number | null;
  head_sha: string | null;
  status: string;
  pr_state: string;
  source: string;
};

export default function TaskPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [me, setMe] = useState<Me | null>(null);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [prUrl, setPrUrl] = useState("");
  const [headSha, setHeadSha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [meData, taskData, subData] = await Promise.all([
        api<Me>("/api/auth/me"),
        api<TaskDetail>(`/api/tasks/${id}`),
        api<Submission[]>("/api/submissions"),
      ]);
      setMe(meData);
      setTask(taskData);
      setSubs(subData.filter((s) => s.task_id === id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load task");
    }
  }, [id]);

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
      setSubmitMsg(`PR recorded at ${created.head_sha?.slice(0, 7) ?? "unknown SHA"} — evaluation runs in Phase 06.`);
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
                  Paste the PR URL against your linked repo. Without the GitHub App, also paste the exact commit SHA from the PR.
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
                <Input
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/pull/123"
                  aria-label="Pull request URL"
                  className="w-full"
                />
                <Input
                  value={headSha}
                  onChange={(e) => setHeadSha(e.target.value)}
                  placeholder="Exact commit SHA (required in manual mode)"
                  aria-label="Exact commit SHA"
                  className="w-full"
                />
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
