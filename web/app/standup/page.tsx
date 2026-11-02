"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Flame,
  History,
  Loader2,
  Mic,
  OctagonAlert,
  Sparkles,
  Square,
  Sunrise,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { STT_UNAVAILABLE_MSG, useVoiceAnswer } from "@/components/voice/use-voice-answer";
import { VoiceWaveform } from "@/components/voice/voice-waveform";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { dayLabel } from "@/lib/activity-feed";
import { api } from "@/lib/api";

type SprintTask = { id: string; key: string; title: string; status: string };
type Proposed = {
  id: string;
  task_id: string | null;
  task_key: string | null;
  yesterday: string;
  today: string;
  blockers: string;
  status: string;
  created_at: string;
};
type Proposal = { standup: Proposed; proposed_changes: string[]; created: boolean };
type HistoryItem = {
  id: string;
  task_key: string | null;
  yesterday: string;
  today: string;
  blockers: string;
  status: string;
  created_at: string;
};

function newKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const PHASES = ["Write", "Review", "Done"] as const;

const QUESTIONS = [
  {
    icon: CalendarCheck2,
    title: "Yesterday",
    hint: "What did you ship or finish?",
    placeholder: "Finished the ticket endpoint, reviewed AI-002…",
    optional: false,
    accent: "bg-info/10 text-info",
    ring: "focus-visible:ring-info/40",
  },
  {
    icon: Target,
    title: "Today",
    hint: "What is the one thing you will move forward?",
    placeholder: "Wire authorization into ticket access…",
    optional: false,
    accent: "bg-primary/10 text-primary",
    ring: "focus-visible:ring-primary/40",
  },
  {
    icon: OctagonAlert,
    title: "Blockers",
    hint: "Anything slowing you down? The Tech Lead sees this.",
    placeholder: "Waiting on review for AI-001…",
    optional: true,
    accent: "bg-warning/10 text-warning",
    ring: "focus-visible:ring-warning/40",
  },
] as const;

/** Consecutive days with a confirmed standup, ending today or yesterday. */
function streakDays(confirmed: HistoryItem[]): number {
  const days = new Set(
    confirmed.map((s) => {
      const d = new Date(s.created_at);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  const cursor = new Date();
  if (!days.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function StandupPage() {
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [taskId, setTaskId] = useState("");
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [pastAll, setPastAll] = useState<HistoryItem[]>([]);
  const [wantMic, setWantMic] = useState(false);
  const voice = useVoiceAnswer((key, text) => {
    const i = Number(key.slice(1));
    setAnswers((a) => a.map((v, j) => (j === i ? (v ? `${v} ${text}` : text) : v)));
  });

  useEffect(() => {
    Promise.all([
      api<{ email: string }>("/api/auth/me"),
      api<{ tasks: SprintTask[] }>("/api/sprints/current"),
      api<HistoryItem[]>("/api/standups").catch(() => [] as HistoryItem[]),
    ])
      .then(([meData, sprint, past]) => {
        setMe(meData);
        const open = sprint.tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
        setTasks(open);
        if (open.length > 0) setTaskId(open[0].id);
        const confirmed = past.filter((s) => s.status === "confirmed");
        setPastAll(confirmed);
        setHistory(confirmed.slice(0, 5));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load standup"))
      .finally(() => setLoading(false));
  }, []);

  async function propose(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const empty = answers.findIndex((a, i) => i < 2 && !a.trim());
    if (empty !== -1) {
      setFieldError(`${QUESTIONS[empty].title} is required.`);
      return;
    }
    setFieldError(null);
    setError(null);
    setBusy(true);
    try {
      const res = await api<Proposal>("/api/standups/propose", {
        method: "POST",
        body: JSON.stringify({
          yesterday: answers[0].trim(),
          today: answers[1].trim(),
          blockers: answers[2].trim(),
          task_id: taskId || null,
          idempotency_key: newKey(),
        }),
      });
      setProposal(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save standup");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!proposal || busy) return;
    setError(null);
    setBusy(true);
    try {
      await api(`/api/standups/${proposal.standup.id}/confirm`, { method: "POST" });
      setDone(true);
      // The just-confirmed entry should appear in the rail immediately.
      api<HistoryItem[]>("/api/standups")
        .then((past) => {
          const confirmed = past.filter((s) => s.status === "confirmed");
          setPastAll(confirmed);
          setHistory(confirmed.slice(0, 5));
        })
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm standup");
    } finally {
      setBusy(false);
    }
  }

  const phase = done ? 3 : proposal ? 2 : 1;
  const streak = useMemo(() => streakDays(pastAll), [pastAll]);
  const answeredCount = answers.filter((a) => a.trim()).length;
  // Locale date strings differ between server and browser — render after mount.
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(todayLabel());
  }, []);

  const historyList = (history ?? []).map((s) => (
    <li key={s.id} className="relative rounded-xl border border-border bg-card px-3.5 py-3 text-sm shadow-sm">
      <span aria-hidden className="absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {dayLabel(s.created_at)}
        </span>
        {s.task_key ? (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            {s.task_key}
          </span>
        ) : null}
      </div>
      <dl className="mt-1.5 space-y-1.5">
        {(
          [
            ["Yesterday", s.yesterday],
            ["Today", s.today],
            ["Blockers", s.blockers || "None"],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="text-sm leading-6">{value}</dd>
          </div>
        ))}
      </dl>
    </li>
  ));

  const historyRail = (
    <Card className="lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History size={16} aria-hidden /> Previous standups
        </CardTitle>
        <CardDescription>Your confirmed check-ins, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {history === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing yet — confirm today&apos;s standup and it will appear here tomorrow.
          </p>
        ) : (
          <ul className="ml-2 max-h-[60vh] space-y-3 overflow-y-auto border-l-2 border-border pl-5 pr-1">
            {historyList}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  const hero = (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#6d5ef0] to-[#8b5cf6] p-6 text-white shadow-lift sm:p-8">
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 opacity-25 motion-safe:animate-[spin_60s_linear_infinite]"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="96" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="6 8" />
        <circle cx="100" cy="100" r="68" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="3 6" />
        <circle cx="100" cy="100" r="40" fill="white" fillOpacity="0.12" />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute -bottom-14 -left-8 h-48 w-48 opacity-20"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="90" fill="none" stroke="white" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 6" />
      </svg>
      <div className="relative">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
          <Sunrise size={14} aria-hidden /> Daily standup{today ? ` · ${today}` : ""}
        </p>
        <h1 className="mt-2 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
          {done ? "Standup recorded. Nice work." : proposal ? "One last look." : "What did you move today?"}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/85">
          {done
            ? "Your check-in is on the record. Tomorrow builds on today."
            : "Share what you finished, what you're doing next, and anything in your way. Type or speak your answers — nothing is saved until you review and confirm."}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Flame size={13} aria-hidden className="text-amber-300" />
            {streak === 0 ? "Start your streak today" : `${streak}-day streak`}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <CalendarCheck2 size={13} aria-hidden /> {pastAll.length} check-in{pastAll.length === 1 ? "" : "s"}
          </span>
          <ol aria-label="Standup progress" className="ml-1 flex items-center gap-1.5">
            {PHASES.map((label, i) => {
              const n = i + 1;
              const reached = n <= phase;
              const current = n === phase;
              return (
                <li
                  key={label}
                  aria-current={current ? "step" : undefined}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    current ? "bg-white text-primary" : reached ? "bg-white/25 text-white" : "bg-white/10 text-white/70"
                  }`}
                >
                  {label}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell email={me?.email}>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard"><ArrowLeft size={15} aria-hidden /> Back to dashboard</Link>
      </Button>
      <div className="mt-4">{hero}</div>
      {error ? (
        <p role="alert" className="mt-3 max-w-2xl rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="mt-4 space-y-3">
          <LoadingStatus label="Loading standup…" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-5">
          <div className="min-w-0 space-y-4 lg:col-span-3">
            {done ? (
              <Card className="overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-success via-primary to-[#8b5cf6]" aria-hidden />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 size={20} aria-hidden className="text-success" /> Standup recorded
                  </CardTitle>
                  <CardDescription>
                    {proposal?.standup.blockers
                      ? "Your blocker was flagged on the task and shared with the Tech Lead."
                      : "Nothing blocked — keep the momentum."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild><Link href="/activity">View activity <ArrowRight size={16} aria-hidden /></Link></Button>
                  <Button variant="outline" asChild><Link href="/board">Open board</Link></Button>
                  <Button variant="outline" asChild><Link href="/team/scrum-master">Ask the Scrum Master</Link></Button>
                </CardContent>
              </Card>
            ) : proposal ? (
              <Card>
                <CardHeader>
                  <CardTitle>Review before confirming</CardTitle>
                  <CardDescription>Nothing is recorded until you confirm. Edit by going back.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="relative ml-2 space-y-3 border-l-2 border-border pl-5">
                    {(
                      [
                        [QUESTIONS[0].icon, "Yesterday", proposal.standup.yesterday, "bg-info/10 text-info"],
                        [QUESTIONS[1].icon, "Today", proposal.standup.today, "bg-primary/10 text-primary"],
                        [QUESTIONS[2].icon, "Blockers", proposal.standup.blockers || "None", "bg-warning/10 text-warning"],
                      ] as const
                    ).map(([Icon, label, value, accent]) => (
                      <li key={label} className="relative">
                        <span aria-hidden className={`absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full ${accent}`}>
                          <Icon size={12} />
                        </span>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                        <p className="mt-0.5 text-sm leading-6">{value}</p>
                      </li>
                    ))}
                  </ol>
                  <p className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
                    Ticket: <span className="font-medium text-foreground">{proposal.standup.task_key ?? "No ticket linked"}</span>
                  </p>
                  <div>
                    <p className="text-sm font-semibold">Confirming will:</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {proposal.proposed_changes.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setProposal(null)} variant="outline" disabled={busy}>Back to edit</Button>
                    <Button onClick={confirm} disabled={busy} aria-busy={busy} className="group/btn">
                      {busy ? <><Loader2 size={16} aria-hidden className="animate-spin" /> Confirming…</> : <>Confirm standup <ArrowRight size={16} aria-hidden className="group-hover/btn:translate-x-0.5" /></>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={propose} className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Link your ticket</CardTitle>
                    <CardDescription>Which ticket did this work move forward? Optional, but recommended.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <select
                      id="standup-task"
                      value={taskId}
                      onChange={(e) => setTaskId(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">No ticket linked</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>{t.key} — {t.title}</option>
                      ))}
                    </select>
                  </CardContent>
                </Card>
                {!voice.consented && wantMic ? (
                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={voice.consented}
                        onChange={(e) => voice.setConsented(e.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        I consent to voice processing for this standup. Transcripts are stored and editable;
                        raw audio is never stored.
                      </span>
                    </label>
                  </div>
                ) : null}
                {QUESTIONS.map((q, i) => {
                  const key = `q${i}`;
                  const recording = voice.recordingKey === key;
                  const answered = answers[i].trim().length > 0;
                  const Icon = q.icon;
                  return (
                    <Card key={q.title} className={`transition-colors ${answered ? "border-success/40" : ""}`}>
                      <CardContent className="space-y-2.5 p-4 sm:p-5">
                        <div className="flex items-center gap-2.5">
                          <span aria-hidden className={`flex h-8 w-8 items-center justify-center rounded-lg ${q.accent}`}>
                            <Icon size={16} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <label htmlFor={`standup-${i}`} className="text-sm font-semibold">
                              {i + 1}. {q.title}{" "}
                              {q.optional ? (
                                <span className="font-normal text-muted-foreground">(Optional)</span>
                              ) : (
                                <span aria-hidden className="font-bold text-destructive">*</span>
                              )}
                              {!q.optional ? <span className="sr-only">(required)</span> : null}
                            </label>
                            <p className="text-xs leading-5 text-muted-foreground">{q.hint}</p>
                          </div>
                          {answered && !recording ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                              <CheckCircle2 size={12} aria-hidden /> Answered
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-start gap-2">
                          <textarea
                            id={`standup-${i}`}
                            value={answers[i]}
                            onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                            placeholder={q.placeholder}
                            maxLength={2000}
                            rows={2}
                            className={`flex min-h-16 w-full flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 ${q.ring}`}
                          />
                          {voice.busyKey === key ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              aria-label={`Transcribing ${q.title}`}
                              title="Transcribing — your words will appear in the field for review"
                              className="mt-1"
                            >
                              <Loader2 size={15} aria-hidden className="animate-spin" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant={recording ? "destructive" : "outline"}
                              size="sm"
                              disabled={voice.sttReady === false}
                              onClick={() => {
                                if (!voice.consented) {
                                  setWantMic(true);
                                  return;
                                }
                                void voice.toggleRecord(key);
                              }}
                              aria-label={recording ? `Stop dictating ${q.title}` : `Dictate ${q.title} by voice`}
                              aria-pressed={recording}
                              title={voice.sttReady === false ? STT_UNAVAILABLE_MSG : recording ? "Stop and transcribe" : "Dictate by voice"}
                              className={`mt-1 ${recording ? "border-destructive" : undefined}`}
                            >
                              {recording ? <Square size={15} aria-hidden fill="currentColor" /> : <Mic size={15} aria-hidden />}
                              {recording ? <span className="tabular-nums">{voice.secs}s</span> : null}
                            </Button>
                          )}
                        </div>
                        {recording ? (
                          <div className="flex items-center gap-3 rounded-lg bg-destructive/[0.06] px-3 py-2" role="status">
                            <VoiceWaveform stream={voice.micStream} bars={28} className="flex-1 text-destructive" />
                            <span className="shrink-0 text-xs font-medium text-muted-foreground">
                              Tap <Square size={11} aria-hidden className="inline" fill="currentColor" /> to transcribe — edit before reviewing.
                            </span>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
                <div className="flex flex-wrap items-center gap-3">
                  {voice.sttReady === false && !voice.error ? (
                    <p className="w-full text-sm text-muted-foreground">Voice transcription isn&apos;t connected yet — type your answers above.</p>
                  ) : null}
                  {voice.error ? <p role="alert" className="w-full text-sm text-destructive">{voice.error}</p> : null}
                  {fieldError ? <p role="alert" className="w-full text-sm text-destructive">{fieldError}</p> : null}
                  <Button type="submit" disabled={busy} aria-busy={busy} size="lg">
                    {busy ? <><Loader2 size={16} aria-hidden className="animate-spin" /> Saving…</> : <>Review standup <ArrowRight size={16} aria-hidden /></>}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {answeredCount} of 3 answered · <span aria-hidden className="font-bold text-destructive">*</span> Required
                  </span>
                </div>
              </form>
            )}
          </div>
          <div className="min-w-0 lg:col-span-2">
            <div className="hidden lg:block">{historyRail}</div>
            <details className="lg:hidden">
              <summary className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium">
                Previous standups{history ? ` (${history.length})` : ""}
              </summary>
              <div className="mt-2">{historyRail}</div>
            </details>
          </div>
        </div>
      )}
    </AppShell>
  );
}
