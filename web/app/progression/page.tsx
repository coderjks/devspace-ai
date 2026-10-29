"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Lightbulb, Lock, Trophy, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

type Prereq = { key: string; title: string; met: boolean };
type TaskItem = {
  task_id: string;
  key: string;
  title: string;
  status: string;
  prerequisites: Prereq[];
  latest_decision: string | null;
  latest_reason: string | null;
  latest_approval_id: string | null;
};
type Eligibility = { tasks: TaskItem[]; next_recommended_key: string | null };
type Competency = { skill: string; score: number; evidence_count: number };
type Hint = { level: number; title: string; body: string };
type Remediation = { id: string; failed_checks: string[]; hints: Hint[] };

function verdictBadge(decision: string | null) {
  if (decision === "approved") return <CheckCircle2 size={15} aria-label="approved" className="shrink-0 text-emerald-500" />;
  if (decision === "denied") return <XCircle size={15} aria-label="denied" className="shrink-0 text-destructive" />;
  return <CircleDashed size={15} aria-label="no verdict" className="shrink-0 text-muted-foreground" />;
}

export default function ProgressionPage() {
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [elig, setElig] = useState<Eligibility | null>(null);
  const [comps, setComps] = useState<Competency[] | null>(null);
  const [remed, setRemed] = useState<Remediation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [meData, eligData, compData] = await Promise.all([
        api<{ email: string }>("/api/auth/me"),
        api<Eligibility>("/api/progress/eligibility"),
        api<Competency[]>("/api/progress/competencies"),
      ]);
      setMe(meData);
      setElig(eligData);
      setComps(compData);
      const denied = eligData.tasks.find((t) => t.latest_decision === "denied" && t.latest_approval_id);
      if (denied?.latest_approval_id) {
        try {
          const r = await api<Remediation>(`/api/approvals/${denied.latest_approval_id}/remediation`);
          setRemed(r);
        } catch {
          /* remediation is best-effort; the verdict reason already shows */
        }
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progression");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Task progression & unlocks</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Progression</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Server-derived eligibility only — nothing here unlocks from local state. Approve a ticket through evaluation
        to unlock its dependents.
      </p>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      {elig === null ? (
        <div className="mt-6 space-y-3">
          <LoadingStatus label="Loading progression…" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {elig.next_recommended_key ? (
            <Card className="border-primary/30">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                <p className="text-sm">
                  <strong>Next recommended:</strong> {elig.next_recommended_key} —{" "}
                  {elig.tasks.find((t) => t.key === elig.next_recommended_key)?.title}
                </p>
                <Link href="/board" className="text-sm font-medium text-primary hover:underline">Open board</Link>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock size={16} aria-hidden /> Sprint tickets
              </CardTitle>
              <CardDescription>Prerequisites, server verdicts, and lock state per ticket.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {elig.tasks.map((t) => (
                  <li key={t.task_id} className="rounded-lg border border-border px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm">
                        {verdictBadge(t.latest_decision)}
                        <strong>{t.key}</strong>
                        <span className="text-muted-foreground">{t.title}</span>
                      </span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                      {t.prerequisites.length === 0 ? (
                        <span className="text-muted-foreground">No prerequisites.</span>
                      ) : (
                        t.prerequisites.map((p) => (
                          <span
                            key={p.key}
                            className={`rounded-full px-2.5 py-1 font-medium ${p.met ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
                          >
                            {p.met ? "✓" : "·"} {p.key}
                          </span>
                        ))
                      )}
                    </div>
                    {t.latest_reason ? (
                      <p className="mt-1.5 text-xs text-muted-foreground">Latest verdict: {t.latest_reason}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy size={16} aria-hidden /> Competencies
              </CardTitle>
              <CardDescription>Skill evidence credited by approval verdicts — never self-reported.</CardDescription>
            </CardHeader>
            <CardContent>
              {comps === null ? (
                <Skeleton className="h-12 w-full rounded-xl" />
              ) : comps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No skill evidence yet. Approve your first ticket to start building this profile.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {comps.map((c) => (
                    <li key={c.skill} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="font-medium capitalize">{c.skill.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground">
                        score {c.score} · {c.evidence_count} evidence
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {remed ? (
            <Card className="border-warning/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb size={16} aria-hidden className="text-warning" /> Remediation hints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {remed.hints.map((h) => (
                    <li key={h.level} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <strong>Level {h.level} — {h.title}:</strong>{" "}
                      <span className="text-muted-foreground">{h.body}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
