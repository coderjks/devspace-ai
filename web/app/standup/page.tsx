"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceAnswer } from "@/components/voice/use-voice-answer";
import { VoiceWaveform } from "@/components/voice/voice-waveform";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
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

function newKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const STEPS = ["Yesterday", "Today", "Blockers"] as const;
const PHASES = ["Write", "Review", "Done"] as const;

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
  const [wantMic, setWantMic] = useState(false);
  const voice = useVoiceAnswer((key, text) => {
    const i = Number(key.slice(1));
    setAnswers((a) => a.map((v, j) => (j === i ? (v ? `${v} ${text}` : text) : v)));
  });

  useEffect(() => {
    Promise.all([api<{ email: string }>("/api/auth/me"), api<{ tasks: SprintTask[] }>("/api/sprints/current")])
      .then(([meData, sprint]) => {
        setMe(meData);
        const open = sprint.tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
        setTasks(open);
        if (open.length > 0) setTaskId(open[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load standup"))
      .finally(() => setLoading(false));
  }, []);

  async function propose(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const empty = answers.findIndex((a, i) => i < 2 && !a.trim());
    if (empty !== -1) {
      setFieldError(`${STEPS[empty]} is required.`);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm standup");
    } finally {
      setBusy(false);
    }
  }

  const phase = done ? 3 : proposal ? 2 : 1;

  return (
    <AppShell email={me?.email}>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard"><ArrowLeft size={15} aria-hidden /> Back to dashboard</Link>
      </Button>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Daily standup · text</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Today&apos;s standup</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Answer the three standup questions. You will review the proposed update before anything is recorded.
        Prefer speaking? <Link href="/voice" className="font-medium text-primary hover:underline">Do this standup by voice</Link> — same questions, same review step.
      </p>
      {error ? (
        <p role="alert" className="mt-3 max-w-2xl rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="mt-4 max-w-2xl space-y-3">
          <LoadingStatus label="Loading standup…" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <ol aria-label="Standup progress" className="mt-4 flex max-w-2xl items-center gap-1.5">
            {PHASES.map((label, i) => {
              const n = i + 1;
              const reached = n <= phase;
              const current = n === phase;
              return (
                <li key={label} className="flex flex-1 items-center gap-1.5 last:flex-none" aria-current={current ? "step" : undefined}>
                  <span
                    aria-hidden
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {n < phase ? "✓" : n}
                  </span>
                  <span className={`text-xs font-medium ${reached ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                  {n < PHASES.length ? <span aria-hidden className="mx-1 h-px flex-1 bg-border" /> : null}
                </li>
              );
            })}
          </ol>
          {done ? (
        <Card className="mt-4 max-w-2xl">
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
            <Button variant="outline" asChild><Link href="/voice">Discuss by voice</Link></Button>
          </CardContent>
        </Card>
      ) : proposal ? (
        <Card className="mt-4 max-w-2xl">
          <CardHeader>
            <CardTitle>Review before confirming</CardTitle>
            <CardDescription>Nothing is recorded until you confirm. Edit by going back.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <div><dt className="font-semibold">Yesterday</dt><dd className="text-muted-foreground">{proposal.standup.yesterday}</dd></div>
              <div><dt className="font-semibold">Today</dt><dd className="text-muted-foreground">{proposal.standup.today}</dd></div>
              <div><dt className="font-semibold">Blockers</dt><dd className="text-muted-foreground">{proposal.standup.blockers || "None"}</dd></div>
              <div><dt className="font-semibold">Ticket</dt><dd className="text-muted-foreground">{proposal.standup.task_key ?? "No ticket linked"}</dd></div>
            </dl>
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
        <Card className="mt-4 max-w-2xl">
          <CardHeader>
            <CardTitle>Three questions</CardTitle>
            <CardDescription>Yesterday and Today are required. Link the ticket you worked on.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={propose} className="space-y-4">
              <div>
                <label htmlFor="standup-task" className="text-sm font-medium">Ticket (optional)</label>
                <select
                  id="standup-task"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">No ticket linked</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.key} — {t.title}</option>
                  ))}
                </select>
              </div>
              {!voice.consented && wantMic ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
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
              {STEPS.map((label, i) => {
                const key = `q${i}`;
                const recording = voice.recordingKey === key;
                return (
                <div key={label}>
                  <label htmlFor={`standup-${i}`} className="text-sm font-medium">
                    {i + 1}. {label} {i < 2 ? null : <span className="font-normal text-muted-foreground">(optional)</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`standup-${i}`}
                      value={answers[i]}
                      onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                      placeholder={i === 0 ? "What did you finish?" : i === 1 ? "What is next?" : "Anything blocking you? Type or dictate."}
                      maxLength={2000}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant={recording ? "destructive" : "outline"}
                      size="sm"
                      disabled={voice.busy && !recording}
                      onClick={() => {
                        if (!voice.consented) {
                          setWantMic(true);
                          return;
                        }
                        void voice.toggleRecord(key);
                      }}
                      aria-label={recording ? `Stop dictating ${label}` : `Dictate ${label} by voice`}
                      aria-pressed={recording}
                      title={recording ? "Stop and transcribe" : "Dictate by voice"}
                      className={recording ? "border-destructive" : undefined}
                    >
                      {recording ? <Square size={15} aria-hidden fill="currentColor" /> : <Mic size={15} aria-hidden />}
                      {recording ? <span className="tabular-nums">{voice.secs}s</span> : null}
                    </Button>
                  </div>
                  {recording ? (
                    <div className="mt-2 flex items-center gap-3 rounded-lg bg-destructive/[0.06] px-3 py-2" role="status">
                      <VoiceWaveform stream={voice.micStream} bars={28} className="flex-1 text-destructive" />
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        Tap <Square size={11} aria-hidden className="inline" fill="currentColor" /> to transcribe — edit before reviewing.
                      </span>
                    </div>
                  ) : null}
                </div>
                );
              })}
              {voice.error ? <p role="alert" className="text-sm text-destructive">{voice.error}</p> : null}
              {fieldError ? <p role="alert" className="text-sm text-destructive">{fieldError}</p> : null}
              <Button type="submit" disabled={busy} aria-busy={busy}>
                {busy ? <><Loader2 size={16} aria-hidden className="animate-spin" /> Saving…</> : "Review standup"}
              </Button>
            </form>
          </CardContent>
        </Card>
          )}
        </>
      )}
    </AppShell>
  );
}
