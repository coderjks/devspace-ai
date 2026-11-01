"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, Lightbulb, Lock, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
type RecentEvent = { action: string; object_type: string | null; created_at: string };
type Counts = { total_tasks: number; started_tasks: number; completed_tasks: number; recent_events: RecentEvent[] };

function verdictBadge(decision: string | null) {
  if (decision === "approved") return <CheckCircle2 size={15} aria-label="approved" className="shrink-0 text-emerald-500" />;
  if (decision === "denied") return <XCircle size={15} aria-label="denied" className="shrink-0 text-destructive" />;
  return <CircleDashed size={15} aria-label="no verdict" className="shrink-0 text-muted-foreground" />;
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function GrowthPage() {
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [elig, setElig] = useState<Eligibility | null>(null);
  const [comps, setComps] = useState<Competency[] | null>(null);
  const [remed, setRemed] = useState<Remediation | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [meData, eligData, compData, countsData] = await Promise.all([
        api<{ email: string }>("/api/auth/me"),
        api<Eligibility>("/api/progress/eligibility"),
        api<Competency[]>("/api/progress/competencies"),
        api<Counts>("/api/progress"),
      ]);
      setMe(meData);
      setElig(eligData);
      setComps(compData);
      setCounts(countsData);
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
      setError(e instanceof Error ? e.message : "Failed to load growth data");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nextTask = elig && elig.next_recommended_key
    ? elig.tasks.find((t) => t.key === elig.next_recommended_key) ?? null
    : null;
  const recentEvents = counts?.recent_events ?? [];

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Growth</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Where you stand, what unlocks next</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Server-derived only — approvals unlock dependents, never local state.
      </p>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}

      {elig === null ? (
        <div className="mt-4 space-y-3">
          <LoadingStatus label="Loading growth…" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-5">
            <Skeleton className="h-64 w-full rounded-xl lg:col-span-3" />
            <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Stats strip + next-up banner */}
          <Card>
            <CardContent className="grid grid-cols-3 divide-x divide-border p-0">
              {[
                { value: counts?.total_tasks ?? "—", label: "Sprint tasks" },
                { value: counts?.started_tasks ?? "—", label: "In progress" },
                { value: counts?.completed_tasks ?? "—", label: "Approved" },
              ].map((s) => (
                <div key={s.label} className="px-3 py-2.5 text-center first:rounded-l-xl last:rounded-r-xl">
                  <p className="text-xl font-extrabold tabular-nums leading-none">{s.value}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {nextTask ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Next up</p>
              <p className="text-sm">
                <span className="font-semibold">{nextTask.key}</span>
                <span className="text-muted-foreground"> — {nextTask.title}</span>
              </p>
              <Button size="sm" asChild className="ml-auto h-7 text-xs">
                <Link href="/board">
                  Open board <ArrowRight size={13} aria-hidden />
                </Link>
              </Button>
            </div>
          ) : null}

          {remed ? (
            <Card className="border-warning/40">
              <CardContent className="p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Lightbulb size={15} aria-hidden className="text-warning" /> Remediation hints
                </p>
                <ol className="mt-2 space-y-1.5">
                  {remed.hints.map((h) => (
                    <li key={h.level} className="text-sm">
                      <strong>Level {h.level} — {h.title}:</strong>{" "}
                      <span className="text-muted-foreground">{h.body}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid items-start gap-4 lg:grid-cols-5">
            {/* Tickets with prerequisites + verdicts */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock size={16} aria-hidden /> Sprint tickets
                </CardTitle>
                <CardDescription>Prerequisites, server verdicts, and lock state per ticket.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="space-y-2">
                  {elig.tasks.map((t) => (
                    <li key={t.task_id} className="rounded-lg border border-border px-3 py-2">
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
                              className={`rounded-full px-2.5 py-0.5 font-medium ${p.met ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
                            >
                              {p.met ? "✓" : "·"} {p.key}
                            </span>
                          ))
                        )}
                      </div>
                      {t.latest_reason ? (
                        <p className="mt-1 text-xs text-muted-foreground">Latest verdict: {t.latest_reason}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Side: competencies + recent activity */}
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy size={16} aria-hidden /> Competencies
                  </CardTitle>
                  <CardDescription>Skill evidence from approvals — never self-reported.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {comps === null ? (
                    <Skeleton className="h-12 w-full rounded-xl" />
                  ) : comps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No skill evidence yet. Approve your first ticket to start building this profile.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {comps.map((c) => (
                        <li key={c.skill} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                          <span className="font-medium capitalize">{c.skill.replace(/_/g, " ")}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {c.score} · {c.evidence_count} evidence
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent activity</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {recentEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet — enroll and start a ticket.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {recentEvents.slice(0, 4).map((e, i) => (
                        <li key={`${e.created_at}-${i}`} className="py-1.5">
                          <p className="truncate text-sm font-medium">{e.action}</p>
                          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                            {e.object_type} · {formatEventTime(e.created_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
