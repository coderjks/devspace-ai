"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, CheckCircle2, CircleDashed, ClipboardCheck, Gauge, History, Lightbulb, Lock, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppShell } from "@/components/app-shell";
import { CertificateCard } from "@/components/certificate-card";
import { describeEvent } from "@/lib/activity-feed";
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
type RecentEvent = {
  action: string;
  object_type: string | null;
  object_id?: string | null;
  payload?: { key?: string; from?: string; to?: string } | null;
  created_at: string;
};
type Counts = { total_tasks: number; started_tasks: number; completed_tasks: number; recent_events: RecentEvent[] };
type CheckIn = { summary: string; highlights: string[]; next_steps: string[]; source: string };
type Retro = {
  standups_confirmed: number;
  submissions: number;
  evaluations: number;
  approvals: number;
  denials: number;
  open_blockers: string[];
  notes: string[];
};

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
  const [checkin, setCheckin] = useState<CheckIn | null>(null);
  const [retro, setRetro] = useState<Retro | null>(null);
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
      // Manager feedback + retrospective are best-effort: the page is fully
      // usable from server-derived eligibility alone.
      api<CheckIn>("/api/progress/check-in").then(setCheckin).catch(() => {});
      api<Retro>("/api/progress/retrospective").then(setRetro).catch(() => {});
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
  const total = counts?.total_tasks ?? 0;
  const done = counts?.completed_tasks ?? 0;
  const active = counts?.started_tasks ?? 0;
  const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;

  // Animate the sprint bar from empty once counts arrive (not on mount, which
  // usually precedes the data and would skip the transition). Reduced-motion
  // gets the final state instantly via motion-safe (no transition).
  const [animateBar, setAnimateBar] = useState(false);
  useEffect(() => {
    if (!counts) return;
    const frame = window.requestAnimationFrame(() => setAnimateBar(true));
    return () => window.cancelAnimationFrame(frame);
  }, [counts]);

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Growth</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Where you stand, what unlocks next</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Approvals unlock the tickets that depend on them.
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
        <div className="mt-6 space-y-8">
          {/* Section 1 — Sprint health at a glance */}
          <section aria-label="Sprint health">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Sprint health</p>
            <Card className="mt-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gauge size={16} aria-hidden /> Sprint progress
                </CardTitle>
                <CardDescription>{donePct}% approved{active > 0 ? ` · ${active} in progress` : ""} across {total} tickets</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className="flex h-2 overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-valuenow={donePct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${donePct}% approved, ${activePct}% in progress`}
                >
                  <div
                    className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
                    style={{ width: animateBar ? `${donePct}%` : "0%" }}
                  />
                  <div
                    className="h-full rounded-full bg-primary/35 motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
                    style={{ width: animateBar ? `${activePct}%` : "0%" }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-lg bg-muted/40">
                  {[
                    { value: total, label: "Sprint tasks" },
                    { value: active, label: "In progress" },
                    { value: done, label: "Approved" },
                  ].map((s) => (
                    <div key={s.label} className="px-3 py-2.5 text-center first:rounded-l-lg last:rounded-r-lg">
                      <p className="text-xl font-extrabold tabular-nums leading-none">{s.value}</p>
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {nextTask ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-2.5">
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
          </section>

          {/* Section 2 — Tickets, skills, and remediation */}
          <section aria-label="Tickets and skills">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tickets & skills</p>
            <div className="mt-2 grid items-start gap-4 lg:grid-cols-5">
              <div className="space-y-4 lg:col-span-3">
              {/* Remediation belongs to the denied ticket below */}
              {remed ? (
                <Card className="border-warning/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb size={16} aria-hidden className="text-warning" /> Remediation hints
                    </CardTitle>
                    <CardDescription>Fix these checks to turn the denial into an approval.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ol className="space-y-1.5">
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
              {/* Tickets with prerequisites + verdicts */}
              <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock size={16} aria-hidden /> Sprint tickets
                </CardTitle>
                <CardDescription>What each ticket is waiting on, and where it stands.</CardDescription>
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
              </div>

              {/* Side: competencies + recent activity */}
              <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy size={16} aria-hidden /> Competencies
                  </CardTitle>
                  <CardDescription>Skills earned from your approved work.</CardDescription>
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
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity size={16} aria-hidden /> Recent activity
                  </CardTitle>
                  <CardDescription>Latest server-recorded events.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {recentEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet — enroll and start a ticket.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {recentEvents.slice(0, 4).map((e, i) => (
                        <li key={`${e.created_at}-${i}`} className="py-1.5">
                          <p className="truncate text-sm font-medium">{describeEvent(e)}</p>
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
          </section>

          {/* Section 3 — Feedback from your records */}
          {checkin || retro ? (
          <section aria-label="Feedback from your records">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Feedback</p>
            <div className="mt-2 grid items-start gap-4 lg:grid-cols-5">
              {checkin ? (
                <Card className="lg:col-span-3">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardCheck size={16} aria-hidden /> Engineering Manager check-in
                    </CardTitle>
                    <CardDescription>Based on your actual progress.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <p className="text-sm font-medium">{checkin.summary}</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {checkin.highlights.map((h) => <li key={h}>{h}</li>)}
                    </ul>
                    <p className="pt-1 text-sm font-medium">Next steps:</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {checkin.next_steps.map((n) => <li key={n}>{n}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
              {retro ? (
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <History size={16} aria-hidden /> Sprint retrospective
                    </CardTitle>
                    <CardDescription>
                      {retro.standups_confirmed} standups · {retro.submissions} submissions · {retro.evaluations} evaluations ·{" "}
                      {retro.approvals} approved · {retro.denials} denied
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {retro.notes.map((n) => <li key={n}>{n}</li>)}
                    </ul>
                    {retro.open_blockers.length > 0 ? (
                      <div>
                        <p className="text-sm font-medium">Open blockers:</p>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-warning">
                          {retro.open_blockers.map((b) => <li key={b}>{b}</li>)}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </section>
          ) : null}

          {/* Section 4 — Completion certificate */}
          <section aria-label="Completion certificate">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Certificate</p>
            <div className="mt-2">
              <CertificateCard />
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
