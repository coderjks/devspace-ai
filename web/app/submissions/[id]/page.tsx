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

// Internal check names and details stay in the API (evidence). What the
// student sees is always plain language — never system wording.
function friendlyCheck(check: Check): { title: string; detail: string } {
  if (check.name === "diff_available") {
    return check.status === "pass"
      ? { title: "Changes readable", detail: "We could read your changes for this result." }
      : { title: "Changes not readable yet", detail: "We couldn't read your changes, so there's nothing to review yet. Push your work and run this again." };
  }
  if (check.name === "secret_scan") {
    return check.status === "fail"
      ? { title: "Possible exposed secret", detail: "Something looks like a posted password or key. Remove it, replace it where it was created, and push again." }
      : { title: "No exposed secrets", detail: "Nothing looks like a posted password or key." };
  }
  if (check.name === "wip_marker") {
    return check.status === "fail"
      ? { title: "Marked as draft", detail: "Your changes are marked as not ready. Clear the marker when the work is done and push again." }
      : { title: "Not marked as draft", detail: "No draft markers found." };
  }
  if (check.name === "diff_size") {
    return { title: "Changes too large", detail: "These changes are too large to review in one go — split them into smaller updates." };
  }
  if (check.status === "pass") return { title: "Check passed", detail: "This check passed." };
  if (check.status === "fail") return { title: "Needs attention", detail: "This check needs attention before the ticket can be approved. See your ticket for next steps." };
  return { title: "Check couldn't run", detail: "This check couldn't run for this result. Run it again." };
}

function friendlySeverity(severity: string): string {
  if (severity === "blocking") return "must fix";
  if (severity === "major") return "should fix";
  if (severity === "minor") return "suggestion";
  return "note";
}

function changesUnreadable(checks?: Check[]): boolean {
  return (checks ?? []).some((c) => c.name === "diff_available" && c.status !== "pass");
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
        api<Evaluation[]>(`/api/submissions/${id}/evaluations`, undefined, { cache: false }),
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

  // While the worker has not produced an evaluation yet, re-check every few
  // seconds so the report appears without a manual reload. Stops on arrival.
  useEffect(() => {
    if (evals === null || evals.length > 0) return;
    const timer = setInterval(() => {
      api<Evaluation[]>(`/api/submissions/${id}/evaluations`, undefined, { cache: false })
        .then((list) => setEvals(list))
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [evals, id]);

  const latest = evals && evals.length > 0 ? evals[0] : null;

  return (
    <AppShell email={me?.email}>
      <Link href="/github" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={15} aria-hidden /> Back to GitHub
      </Link>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">PR evaluation</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Review report</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Each result belongs to one exact commit. AI feedback alone never approves a ticket —
        approval follows fixed checks on your work.
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
            <EmptyState icon={FlaskConical} title="Evaluation in progress" hint="Your submission is in the queue — this page updates by itself. You can also start a run from the GitHub page." />
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
              <CardDescription>Quick automated checks on your submission — your work is read, never run, here.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(latest.test_results.checks ?? []).map((c) => {
                  const friendly = friendlyCheck(c);
                  return (
                    <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <span>
                        <strong className="font-medium">{friendly.title}</strong>
                        <span className="text-muted-foreground"> — {friendly.detail}</span>
                        {c.blocking ? <span className="text-destructive"> · required</span> : null}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${checkBadge(c.status)}`}>{c.status}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles size={16} aria-hidden /> AI review
                {latest.ai_review.mock ? (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    practice review
                  </span>
                ) : null}
              </CardTitle>
              <CardDescription>
                {changesUnreadable(latest.test_results.checks)
                  ? "We couldn't read your changes for this result, so there's nothing to review yet. Push your work and run this again."
                  : (latest.ai_review.summary ?? "No reviewer notes for this result.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latest.ai_review.error ? (
                <p className="text-sm text-destructive">The review couldn&apos;t finish this time — try running it again.</p>
              ) : (latest.ai_review.findings ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No issues found.</p>
              ) : (
                <ul className="space-y-2">
                  {(latest.ai_review.findings ?? []).map((f, i) => (
                    <li key={i} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{friendlySeverity(f.severity)}</span>
                      <p className="mt-1.5 text-muted-foreground">{f.message}</p>
                    </li>
                  ))}
                </ul>
              )}
              {evals.length > 1 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  We keep every result — the newest is shown here.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
