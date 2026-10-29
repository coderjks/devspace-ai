"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical, ScanSearch, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

type Check = { name: string; status: string; detail: string; blocking?: boolean };
type Finding = { severity: string; message: string; file?: string; line?: number };
type Evaluation = {
  id: string;
  sha: string;
  test_results: { status: string; checks?: Check[]; stats?: Record<string, number> };
  ai_review: { mock?: boolean; summary?: string; findings?: Finding[]; error?: string | null };
  policy_decision: string | null;
  policy_reason: string | null;
  model_version: string | null;
  created_at: string;
};

function checkBadge(status: string): string {
  if (status === "pass") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (status === "fail") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

export default function SubmissionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [evals, setEvals] = useState<Evaluation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [meData, list] = await Promise.all([
        api<{ email: string }>("/api/auth/me"),
        api<Evaluation[]>(`/api/submissions/${id}/evaluations`),
      ]);
      setMe(meData);
      setEvals(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load evaluation");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const latest = evals && evals.length > 0 ? evals[0] : null;

  return (
    <AppShell email={me?.email}>
      <Link href="/github" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={15} aria-hidden /> Back to GitHub
      </Link>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">PR evaluation</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Review report</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Results are tied to an exact commit SHA. A language-model review alone never approves a ticket — the
        deterministic policy in Phase 07 decides.
      </p>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      {evals === null ? (
        <div className="mt-6 space-y-3">
          <LoadingStatus label="Loading evaluation…" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : latest === null ? (
        <Card className="mt-6">
          <CardContent>
            <EmptyState icon={FlaskConical} title="No evaluation yet" hint="The background worker picks up queued submissions automatically; you can also trigger a run from the GitHub page." />
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evaluated commit</CardTitle>
              <CardDescription>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{latest.sha}</code>
                {latest.model_version ? <span> · model {latest.model_version}</span> : null}
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScanSearch size={16} aria-hidden /> Automated checks
              </CardTitle>
              <CardDescription>Safe static analysis only — student code is never executed by this pipeline.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(latest.test_results.checks ?? []).map((c) => (
                  <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <span>
                      <strong className="font-medium">{c.name}</strong>
                      <span className="text-muted-foreground"> — {c.detail}</span>
                      {c.blocking ? <span className="text-destructive"> · blocking</span> : null}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${checkBadge(c.status)}`}>{c.status}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles size={16} aria-hidden /> AI review
                {latest.ai_review.mock ? (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    mock — advisory only
                  </span>
                ) : null}
              </CardTitle>
              <CardDescription>{latest.ai_review.summary ?? "No summary."}</CardDescription>
            </CardHeader>
            <CardContent>
              {latest.ai_review.error ? (
                <p className="text-sm text-destructive">Review unavailable: {latest.ai_review.error}</p>
              ) : (latest.ai_review.findings ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No findings reported.</p>
              ) : (
                <ul className="space-y-2">
                  {(latest.ai_review.findings ?? []).map((f, i) => (
                    <li key={i} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{f.severity}</span>
                      <p className="mt-1.5 text-muted-foreground">{f.message}</p>
                    </li>
                  ))}
                </ul>
              )}
              {evals.length > 1 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {evals.length - 1} older evaluation{evals.length > 2 ? "s" : ""} for previous SHAs — history is immutable, newest shown.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
