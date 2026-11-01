"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Github, Link2, Trash2, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

type Repo = {
  id: string;
  full_name: string;
  link_method: string;
  created_at: string;
};

type Status = { app_configured: boolean; base_repo: string | null; repos: Repo[] };

type Submission = {
  id: string;
  task_key: string | null;
  pr_number: number | null;
  head_sha: string | null;
  status: string;
  pr_state: string;
  source: string;
  latest_decision: string | null;
};

export default function GithubPage() {
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [meData, st, list] = await Promise.all([
        api<{ email: string }>("/api/auth/me"),
        api<Status>("/api/github/status"),
        api<Submission[]>("/api/submissions"),
      ]);
      setMe(meData);
      setStatus(st);
      setSubs(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load GitHub status");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function link() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/github/repos", { method: "POST", body: JSON.stringify({ full_name: fullName.trim() }) });
      setFullName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Link failed");
    } finally {
      setBusy(false);
    }
  }

  async function unlink(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/github/repos/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unlink failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Repository access</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">GitHub Connection</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Link your internship repository so pull requests map to sprint tickets. No fake OAuth — linking is explicit
        and revocation is immediate.
      </p>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      {status === null ? (
        <div className="mt-6 space-y-3">
          <LoadingStatus label="Loading GitHub status…" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Github size={16} aria-hidden /> Get connected
              </CardTitle>
              <CardDescription>
                {status.app_configured ? "GitHub App connected." : "Manual mode — no App installed."}{" "}
                {status.base_repo ? `PRs go from your fork to ${status.base_repo}.` : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="space-y-1">
                {[
                  {
                    n: 1,
                    title: "Fork the base repo",
                    hint: status.base_repo ? `Fork ${status.base_repo} on GitHub.` : "Create your working repository.",
                    done: status.repos.length > 0,
                    action: status.base_repo ? (
                      <a href={`https://github.com/${status.base_repo}/fork`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                        Fork on GitHub →
                      </a>
                    ) : null,
                  },
                  {
                    n: 2,
                    title: "Link your fork here",
                    hint: "Paste owner/repo — never the base repo.",
                    done: status.repos.length > 0,
                    action: null,
                  },
                  {
                    n: 3,
                    title: "Open a pull request",
                    hint: "From your fork, then submit it from a ticket.",
                    done: (subs ?? []).length > 0,
                    action: (
                      <Link href="/board" className="font-medium text-primary hover:underline">
                        Pick a ticket →
                      </Link>
                    ),
                  },
                ].map((s) => (
                  <li key={s.n} className="flex gap-3 rounded-lg px-1 py-2">
                    <span
                      aria-hidden
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        s.done ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.done ? "✓" : s.n}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.hint}</p>
                      {s.action ? <p className="mt-0.5 text-xs">{s.action}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 size={16} aria-hidden /> Linked {status.base_repo ? "fork" : "repositories"}
              </CardTitle>
              <CardDescription>
                {status.base_repo ? (
                  <>
                    Link <strong>your fork</strong>, not the base repo.{" "}
                    <a href={`https://github.com/${status.base_repo}/fork`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                      Fork {status.base_repo} on GitHub →
                    </a>
                  </>
                ) : (
                  "Only PRs from these repositories map to your tickets."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="owner/repo"
                  aria-label="Repository full name"
                  className="sm:max-w-xs"
                />
                <Button onClick={link} disabled={busy || !fullName.trim()}>Link repository</Button>
              </div>
              {status.repos.length === 0 ? (
                <EmptyState icon={Unplug} title="No repositories linked" hint="Link your fork to start submitting PRs." />
              ) : (
                <ul className="space-y-2">
                  {status.repos.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="font-medium">{r.full_name}</span>
                      <Button variant="ghost" size="sm" onClick={() => unlink(r.id)} disabled={busy} aria-label={`Unlink ${r.full_name}`}>
                        <Trash2 size={15} aria-hidden /> Unlink
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Submitted pull requests</CardTitle>
              <CardDescription>From verified webhooks or ticket submissions.</CardDescription>
            </CardHeader>
            <CardContent>
              {subs === null ? (
                <Skeleton className="h-16 w-full rounded-xl" />
              ) : subs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No PRs yet. Open one against a linked repo, or submit its URL from a ticket.</p>
              ) : (
                <ul className="space-y-2">
                  {subs.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <Link href={`/submissions/${s.id}`} className="hover:underline">
                        {s.task_key ? <strong>{s.task_key}</strong> : "Ticket"}
                        {s.pr_number ? <span className="text-muted-foreground"> · PR #{s.pr_number}</span> : null}
                        {s.head_sha ? <span className="text-muted-foreground"> · {s.head_sha.slice(0, 7)}</span> : null}
                      </Link>
                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{s.status}</span>
                        {s.task_key ? (
                          <Link href="/board" className="text-xs font-medium text-primary hover:underline">Board</Link>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
