"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { TeammateAvatar } from "@/components/ui/teammate-avatar";
import { STT_UNAVAILABLE_MSG, useVoiceAnswer } from "@/components/voice/use-voice-answer";
import { ChatMarkdown } from "@/components/chat-markdown";
import { VoiceWaveform } from "@/components/voice/voice-waveform";
import { useProviderStatus } from "@/lib/provider-status";
import { api } from "@/lib/api";

type Message = { id: string; role: string; content: string; created_at: string };
type Conversation = { id: string; persona: string; task_id: string | null; title: string; created_at: string };

const PERSONA_LABELS: Record<string, string> = {
  "engineering-manager": "Engineering Manager",
  "tech-lead": "Tech Lead",
  "senior-engineer": "Senior Software Engineer",
  "qa-engineer": "QA Engineer",
  "scrum-master": "Scrum Master",
  "learning-assistant": "Learning Assistant",
};

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export function ChatPanel({
  persona,
  teammateName,
  teammateRole,
  responsibilities,
  youName,
}: {
  persona: string;
  teammateName: string;
  teammateRole: string;
  responsibilities: string;
  youName: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMock, setIsMock] = useState(true);
  const provider = useProviderStatus();
  // Live status wins once loaded; the per-reply flag only matters before that.
  const showMock = provider ? provider.mock : isMock;
  const [error, setError] = useState<string | null>(null);
  const [wantMic, setWantMic] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const voice = useVoiceAnswer(
    (_key, text) => setDraft((d) => (d ? `${d} ${text}` : text).slice(0, 4000)),
    { persona }
  );
  const recording = voice.recordingKey === "chat";

  const loadMessages = useCallback(async (convId: string | null) => {
    if (!convId) {
      setMessages([]);
      return;
    }
    const list = await api<Message[]>(`/api/agents/conversations/${convId}/messages`);
    setMessages(list);
  }, []);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setActiveId(null);
    setError(null);
    api<Conversation[]>(`/api/agents/${persona}/conversations`)
      .then(async (convs) => {
        setConversations(convs);
        const first = convs[0]?.id ?? null;
        setActiveId(first);
        await loadMessages(first);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load chat"))
      .finally(() => setLoading(false));
  }, [persona, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content, created_at: new Date().toISOString() }]);
    setDraft("");
    try {
      const reply = await api<{ conversation_id: string; message: Message; mock: boolean }>(
        `/api/agents/${persona}/messages`,
        { method: "POST", body: JSON.stringify({ content, conversation_id: activeId }) }
      );
      setIsMock(reply.mock);
      if (!activeId || activeId !== reply.conversation_id) {
        setActiveId(reply.conversation_id);
        const convs = await api<Conversation[]>(`/api/agents/${persona}/conversations`);
        setConversations(convs);
      }
      await loadMessages(reply.conversation_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
      await loadMessages(activeId);
    } finally {
      setSending(false);
    }
  }

  let lastDay = "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3 md:px-5">
        <TeammateAvatar name={teammateName} seed={persona} size="md" />
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-extrabold tracking-tight">
            {teammateName}
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Active
            </span>
          </h2>
          <p className="truncate text-xs text-muted-foreground">{teammateRole}</p>
        </div>
        {showMock ? (
          <span className="hidden shrink-0 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning sm:inline-block">
            Mock
          </span>
        ) : null}
      </div>
      {loading ? (
        <div className="space-y-3 p-4">
          <LoadingStatus label="Loading conversation…" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {error ? (
            <p role="alert" className="m-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div aria-live="polite" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3 md:px-4">
            {messages.map((m) => {
              if (m.role === "system") {
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2">
                    <span aria-hidden className="h-px flex-1 bg-border" />
                    <p className="max-w-[90%] text-center text-xs text-muted-foreground">{m.content}</p>
                    <span aria-hidden className="h-px flex-1 bg-border" />
                  </div>
                );
              }
              const mine = m.role === "user";
              const day = dayLabel(m.created_at);
              const showDay = day && day !== lastDay;
              lastDay = day;
              return (
                <div key={m.id}>
                  {showDay ? (
                    <div className="flex items-center gap-3 py-2">
                      <span aria-hidden className="h-px flex-1 bg-border" />
                      <p className="rounded-full border border-border px-3 py-0.5 text-xs font-medium text-muted-foreground">{day}</p>
                      <span aria-hidden className="h-px flex-1 bg-border" />
                    </div>
                  ) : null}
                  <div className="flex gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40">
                    <TeammateAvatar
                      name={mine ? youName : teammateName}
                      seed={mine ? `you-${youName}` : persona}
                      size="sm"
                      animate={false}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-bold">{mine ? youName : teammateName}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(m.created_at)}</span>
                      </p>
                      <div className="mt-0.5">
                        <ChatMarkdown text={m.content} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                This is the start of your conversation with {teammateName}. Say hello.
              </p>
            ) : null}
            {sending ? (
              <div className="flex gap-2.5 rounded-lg px-2 py-1.5">
                <TeammateAvatar name={teammateName} seed={persona} size="sm" animate={false} />
                <div className="flex-1">
                  <p className="flex items-baseline gap-x-2">
                    <span className="text-sm font-bold">{teammateName}</span>
                    <span
                      className="flex items-center gap-1"
                      role="status"
                      aria-label={`${teammateName} is typing`}
                    >
                      <span className="sr-only">{teammateName} is typing</span>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full bg-muted-foreground motion-safe:animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </span>
                  </p>
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
          <form
            className="border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            {!voice.consented && wantMic ? (
              <div className="mb-2 rounded-lg border border-border bg-muted/40 p-2.5 text-sm">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={voice.consented}
                    onChange={(e) => voice.setConsented(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I consent to voice processing for this chat. Transcripts are editable drafts;
                    raw audio is never stored.
                  </span>
                </label>
              </div>
            ) : null}
            <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
              <label htmlFor={`chat-input-${persona}`} className="sr-only">Message {teammateName}</label>
              <Input
                id={`chat-input-${persona}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Message ${teammateName}…`}
                maxLength={4000}
                disabled={sending}
                className="border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
              />
              {voice.busyKey === "chat" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  aria-label="Transcribing your voice"
                  title="Transcribing your voice — your words will appear above for review"
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
                  void voice.toggleRecord("chat");
                }}
                aria-label={recording ? `Stop dictating to ${teammateName}` : `Dictate to ${teammateName} by voice`}
                aria-pressed={recording}
                title={voice.sttReady === false ? STT_UNAVAILABLE_MSG : recording ? "Stop and transcribe" : "Dictate by voice"}
                className={recording ? "border-destructive" : undefined}
              >
                {recording ? <Square size={15} aria-hidden fill="currentColor" /> : <Mic size={15} aria-hidden />}
                {recording ? <span className="tabular-nums">{voice.secs}s</span> : null}
              </Button>
              )}
              <Button type="submit" size="sm" disabled={sending || voice.busyKey === "chat" || !draft.trim()} aria-busy={sending}>
                {sending ? <Loader2 size={16} aria-hidden className="animate-spin" /> : <Send size={16} aria-hidden />}
                <span className="sr-only">Send</span>
              </Button>
            </div>
            {recording ? (
              <div className="mt-2 flex items-center gap-3 rounded-lg bg-destructive/[0.06] px-3 py-2" role="status">
                <VoiceWaveform stream={voice.micStream} bars={20} className="flex-1 text-destructive" />
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  Tap <Square size={11} aria-hidden className="inline" fill="currentColor" /> to transcribe — review before sending.
                </span>
              </div>
            ) : null}
            {voice.sttReady === false && !voice.error ? (
              <p className="mt-1.5 px-1 text-xs text-muted-foreground">Voice transcription isn&apos;t connected yet — type instead.</p>
            ) : null}
            {voice.error ? <p role="alert" className="mt-1.5 px-1 text-xs text-destructive">{voice.error}</p> : null}
            {responsibilities ? <p className="mt-1.5 px-1 text-xs text-muted-foreground">{responsibilities}</p> : null}
          </form>
        </>
      )}
    </div>
  );
}

export { PERSONA_LABELS };
