"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { TeammateAvatar } from "@/components/ui/teammate-avatar";
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

const VOICE_PERSONAS = new Set(["tech-lead", "scrum-master"]);

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
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
        <TeammateAvatar name={teammateName} seed={persona} />
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-extrabold tracking-tight">
            {teammateName}
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              active
            </span>
          </h2>
          <p className="truncate text-xs text-muted-foreground">{teammateRole}</p>
        </div>
        {isMock ? (
          <span className="hidden shrink-0 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning sm:inline-block">
            mock
          </span>
        ) : null}
        {VOICE_PERSONAS.has(persona) ? (
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href="/voice" aria-label={`Talk to ${teammateName} by voice`}>
              <Mic size={15} aria-hidden />
              <span className="hidden sm:inline">Voice</span>
            </Link>
          </Button>
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
                      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-6">{m.content}</p>
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
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      typing <Loader2 size={11} aria-hidden className="animate-spin" />
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
              <Button type="submit" size="sm" disabled={sending || !draft.trim()} aria-busy={sending}>
                {sending ? <Loader2 size={16} aria-hidden className="animate-spin" /> : <Send size={16} aria-hidden />}
                <span className="sr-only">Send</span>
              </Button>
            </div>
            {responsibilities ? <p className="mt-1.5 px-1 text-xs text-muted-foreground">{responsibilities}</p> : null}
          </form>
        </>
      )}
    </div>
  );
}

export { PERSONA_LABELS };
