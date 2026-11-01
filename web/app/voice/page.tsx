"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, MicOff, PencilLine, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

type Persona = "scrum-master" | "tech-lead";

type Turn = {
  id: string;
  input_mode: string;
  transcript: string;
  submitted_text: string | null;
  stt_mock: boolean;
  reply_text: string | null;
};

type SubmitResult = {
  turn: Turn;
  reply_text: string;
  reply_mock: boolean;
  audio_wav_base64: string | null;
  audio_mock: boolean;
};

const STANDUP_QUESTIONS = [
  { key: "yesterday", label: "What did you complete?" },
  { key: "today", label: "What will you work on next?" },
  { key: "blockers", label: "Any blockers?" },
] as const;

export default function VoicePage() {
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [persona, setPersona] = useState<Persona>("tech-lead");
  const [languageHint, setLanguageHint] = useState("en");
  const [consent, setConsent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<"speak" | "type">("speak");
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [typed, setTyped] = useState("");
  const [draft, setDraft] = useState("");
  const [activeTurn, setActiveTurn] = useState<Turn | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({ yesterday: "", today: "", blockers: "" });
  const [taskId, setTaskId] = useState("");
  const [tasks, setTasks] = useState<{ id: string; key: string; title: string }[]>([]);
  const [proposal, setProposal] = useState<{ standup: { id: string }; proposed_changes: string[]; created: boolean } | null>(null);
  const [standupMsg, setStandupMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ email: string }>("/api/auth/me").then(setMe).catch(() => {});
    api<{ tasks: { id: string; key: string; title: string }[] }>("/api/sprints/current")
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const startSession = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const s = await api<{ id: string }>("/api/voice/sessions", {
        method: "POST",
        body: JSON.stringify({ persona, language_hint: languageHint, consent }),
      });
      setSessionId(s.id);
      setActiveTurn(null);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start voice session");
    } finally {
      setBusy(false);
    }
  }, [persona, languageHint, consent]);

  async function startRecording() {
    setError(null);
    setMicBlocked(false);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicBlocked(true);
      setError("Microphone permission was denied. Allow access in the browser, or use Type mode instead.");
      return;
    }
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => upload(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
    recorderRef.current = rec;
    rec.start();
    setRecording(true);
    setRecSecs(0);
    timerRef.current = window.setInterval(() => setRecSecs((s) => s + 1), 1000);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRecording(false);
  }

  async function upload(blob: Blob) {
    if (!sessionId) return;
    if (blob.size === 0) {
      setError("Nothing was recorded — check the microphone and try again, or use Type mode.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, "turn.webm");
      const res = await fetch(`/api/voice/sessions/${sessionId}/turns`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? `Upload failed (${res.status})`);
      const turn = (await res.json()) as Turn;
      setActiveTurn(turn);
      setDraft(turn.transcript);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitTyped() {
    if (!sessionId || !typed.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const turn = await api<Turn>(`/api/voice/sessions/${sessionId}/typed-turns`, {
        method: "POST",
        body: JSON.stringify({ text: typed.trim() }),
      });
      setActiveTurn(turn);
      setDraft(turn.transcript);
      setResult(null);
      setTyped("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create turn");
    } finally {
      setBusy(false);
    }
  }

  async function submitTurn() {
    if (!activeTurn) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<SubmitResult>(`/api/voice/turns/${activeTurn.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ edited_text: draft }),
      });
      setResult(r);
      setActiveTurn(r.turn);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function proposeStandup() {
    setStandupMsg(null);
    try {
      const r = await api<{ standup: { id: string }; proposed_changes: string[]; created: boolean }>(
        "/api/standups/propose",
        {
          method: "POST",
          body: JSON.stringify({
            yesterday: answers.yesterday,
            today: answers.today,
            blockers: answers.blockers,
            task_id: taskId || null,
            idempotency_key: crypto.randomUUID().replace(/-/g, ""),
          }),
        }
      );
      setProposal(r);
    } catch (e) {
      setStandupMsg(e instanceof Error ? e.message : "Propose failed");
    }
  }

  async function confirmStandup() {
    if (!proposal) return;
    try {
      await api(`/api/standups/${proposal.standup.id}/confirm`, { method: "POST" });
      setStandupMsg("Standup confirmed — blockers shared with the Tech Lead. State changed only on your confirm.");
      setProposal(null);
    } catch (e) {
      setStandupMsg(e instanceof Error ? e.message : "Confirm failed");
    }
  }

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Voice standup & conversation</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Voice</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Speak with the Scrum Master or Tech Lead, edit the transcript, then submit. Voice never changes sprint state
        by itself — confirmations stay explicit. Prefer typing? Use Type mode or continue in text chat.
      </p>

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session setup</CardTitle>
            <CardDescription>One persona per session. Consent is recorded before the mic unlocks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Persona">
              {(["tech-lead", "scrum-master"] as Persona[]).map((p) => (
                <Button key={p} variant={persona === p ? "default" : "outline"} size="sm" onClick={() => { setPersona(p); setSessionId(null); }}>
                  {p === "tech-lead" ? "Tech Lead" : "Scrum Master"}
                </Button>
              ))}
              <label className="ml-auto flex items-center gap-2 text-sm">
                Language
                <select value={languageHint} onChange={(e) => setLanguageHint(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-sm" aria-label="Language hint">
                  <option value="en">English</option>
                  <option value="hi-en">Hindi-English</option>
                </select>
              </label>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
              I consent to voice processing. Transcripts are stored; raw audio is never stored.
            </label>
            {!sessionId ? (
              <Button onClick={startSession} disabled={busy || !consent}>Start voice session</Button>
            ) : (
              <p className="text-sm text-muted-foreground">Session active — record or type below. <Button variant="ghost" size="sm" onClick={() => setSessionId(null)}>End</Button></p>
            )}
          </CardContent>
        </Card>

        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

        {sessionId ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Say it or type it</CardTitle>
                <CardDescription>
                  Transcription runs on the configured provider. In this environment only test fixtures transcribe —
                  real microphone audio needs a live provider, otherwise use Type mode.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2" role="tablist" aria-label="Input mode">
                  <Button variant={mode === "speak" ? "default" : "outline"} size="sm" onClick={() => setMode("speak")}>Speak</Button>
                  <Button variant={mode === "type" ? "default" : "outline"} size="sm" onClick={() => setMode("type")}>Type</Button>
                </div>
                {mode === "speak" ? (
                  <div className="flex items-center gap-3">
                    {!recording ? (
                      <Button onClick={startRecording} disabled={busy} aria-label="Start recording">
                        <Mic size={16} aria-hidden /> Record {micBlocked ? "(blocked)" : ""}
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={stopRecording} aria-label="Stop recording">
                        <Square size={16} aria-hidden /> Stop ({recSecs}s)
                      </Button>
                    )}
                    {busy ? <LoadingStatus label="Transcribing…" /> : null}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type what you would say…" aria-label="Typed turn" className="sm:max-w-md" />
                    <Button onClick={submitTyped} disabled={busy || !typed.trim()}><PencilLine size={15} aria-hidden /> Create turn</Button>
                  </div>
                )}
                {activeTurn ? (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">
                      Transcript ({activeTurn.input_mode === "typed" ? "typed" : activeTurn.stt_mock ? "mock transcription" : "live transcription"}) — edit before submitting.
                    </p>
                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} aria-label="Edit transcript" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    <Button onClick={submitTurn} disabled={busy || !draft.trim()}><Send size={15} aria-hidden /> Submit to {persona === "tech-lead" ? "Tech Lead" : "Scrum Master"}</Button>
                  </div>
                ) : null}
                {result ? (
                  <div className="space-y-2 rounded-lg border border-border p-3" aria-live="polite">
                    <p className="text-sm"><strong>Reply{result.reply_mock ? " (mock, advisory)" : ""}:</strong></p>
                    <p className="text-sm text-muted-foreground">{result.reply_text}</p>
                    {result.audio_wav_base64 ? (
                      <audio controls src={`data:audio/wav;base64,${result.audio_wav_base64}`} className="w-full">
                        Audio playback not supported — read the reply text above.
                      </audio>
                    ) : (
                      <p className="text-xs text-muted-foreground">No audio synthesized (provider unavailable) — text reply above is the fallback.</p>
                    )}
                    <p className="text-xs">
                      <Link href={`/team/${persona}`} className="font-medium text-primary hover:underline">Continue in text chat →</Link>
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {persona === "scrum-master" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Guided standup</CardTitle>
                  <CardDescription>
                    Answer the three standup questions (speak above or type here), then review and confirm.
                    Nothing is recorded until you confirm.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {STANDUP_QUESTIONS.map((q) => (
                    <div key={q.key} className="space-y-1">
                      <label htmlFor={`voice-${q.key}`} className="text-sm font-medium">{q.label}</label>
                      <textarea id={`voice-${q.key}`} value={answers[q.key]} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                  ))}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select value={taskId} onChange={(e) => setTaskId(e.target.value)} aria-label="Related ticket" className="rounded-md border border-input bg-background px-2 py-2 text-sm">
                      <option value="">No specific ticket</option>
                      {tasks.map((t) => <option key={t.id} value={t.id}>{t.key} — {t.title}</option>)}
                    </select>
                    <Button onClick={proposeStandup} disabled={!answers.yesterday.trim() || !answers.today.trim()}>Review proposed changes</Button>
                  </div>
                  {proposal ? (
                    <div className="space-y-2 rounded-lg border border-primary/30 p-3">
                      <p className="text-sm font-medium">Proposed changes:</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {proposal.proposed_changes.map((c) => <li key={c}>{c}</li>)}
                      </ul>
                      <Button onClick={confirmStandup}>Confirm standup</Button>
                    </div>
                  ) : null}
                  {standupMsg ? <p role="status" className="text-sm text-muted-foreground">{standupMsg}</p> : null}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tip</CardTitle>
                  <CardDescription>
                    Switch to the Scrum Master above for the guided yesterday/today/blockers flow. Confirmed blockers
                    are shared with the Tech Lead automatically.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </>
        ) : (
          !me ? <Skeleton className="h-32 w-full rounded-xl" /> : (
            <Card>
              <CardContent>
                <EmptyState icon={MicOff} title="No voice session yet" hint="Choose a persona, record consent, and start. Or skip voice entirely — text chat does everything." />
              </CardContent>
            </Card>
          )
        )}
      </div>
    </AppShell>
  );
}
