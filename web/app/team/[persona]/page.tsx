"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type PersonaMeta = { id: string; name: string; role: string; responsibilities: string; kind: string };
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

function Avatar({ name, seed, size = "md" }: { name: string; seed: string; size?: "md" | "sm" }) {
  const h = hueFor(seed);
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg font-bold text-white",
        size === "md" ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs"
      )}
      style={{ backgroundColor: `hsl(${h} 45% 45%)` }}
    >
      {initials(name)}
    </span>
  );
}

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

export default function ChatPage({ params }: { params: { persona: string } }) {
  const { persona } = params;
  const known = persona in PERSONA_LABELS;
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [meta, setMeta] = useState<PersonaMeta | null>(null);
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
    if (!known) {
      setLoading(false);
      return;
    }
    Promise.all([
      api<{ email: string }>("/api/auth/me"),
      api<{ members: PersonaMeta[] }>("/api/team"),
      api<Conversation[]>(`/api/agents/${persona}/conversations`),
    ])
      .then(async ([meData, team, convs]) => {
        setMe(meData);
        setMeta(team.members.find((m) => m.id === persona) ?? null);
        setConversations(convs);
        const first = convs[0]?.id ?? null;
        setActiveId(first);
        await loadMessages(first);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load chat"))
      .finally(() => setLoading(false));
  }, [persona, known, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    // Optimistic row; replaced by the authoritative fetch below.
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

  const teammateName = meta?.name ?? PERSONA_LABELS[persona] ?? persona;
  const youName = me?.email ? me.email.split("@")[0] : "You";
  let lastDay = "";

  return (
    <AppShell email={me?.email}>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/team"><ArrowLeft size={15} aria-hidden /> Back to team</Link>
      </Button>
      {!known ? (
        <p role="alert" className="mt-4 text-sm text-destructive">Unknown teammate.</p>
      ) : loading ? (
        <div className="mt-4 space-y-3">
          <LoadingStatus label="Loading conversation…" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-start gap-3">
            <Avatar name={teammateName} seed={persona} />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight">
                {teammateName}
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  active
                </span>
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{meta?.role ?? PERSONA_LABELS[persona]}</p>
              {isMock ? (
                <p className="mt-2 inline-block rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                  Simulated replies — mock mode, no live model
                </p>
              ) : null}
            </div>
            {VOICE_PERSONAS.has(persona) ? (
              <Button variant="outline" size="sm" asChild className="ml-auto shrink-0">
                <Link href="/voice" aria-label={`Talk to ${teammateName} by voice`}>
                  <Mic size={15} aria-hidden /> Voice
                </Link>
              </Button>
            ) : null}
          </div>
          <Card>
            <CardContent className="p-0">
              {error ? (
                <p role="alert" className="m-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <div aria-live="polite" className="max-h-[55vh] space-y-1 overflow-y-auto px-4 py-4 md:px-6">
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
                      <div className="flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40">
                        <Avatar name={mine ? youName : teammateName} seed={mine ? `you-${me?.email ?? ""}` : persona} size="sm" />
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
                  <div className="flex gap-3 rounded-lg px-2 py-2">
                    <Avatar name={teammateName} seed={persona} size="sm" />
                    <div className="flex-1">
                      <p className="flex items-baseline gap-x-2">
                        <span className="text-sm font-bold">{teammateName}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          typing
                          <Loader2 size={11} aria-hidden className="animate-spin" />
                        </span>
                      </p>
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
              <form
                className="border-t border-border p-3 md:p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                  <label htmlFor="chat-input" className="sr-only">Message {teammateName}</label>
                  <Input
                    id="chat-input"
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
                <p className="mt-1.5 px-1 text-xs text-muted-foreground">
                  {meta?.responsibilities ?? ""}
                </p>
              </form>
            </CardContent>
          </Card>
          {conversations.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {conversations.map((c) => (
                <Button
                  key={c.id}
                  variant={c.id === activeId ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveId(c.id);
                    void loadMessages(c.id).catch((e) =>
                      setError(e instanceof Error ? e.message : "Failed to load conversation")
                    );
                  }}
                >
                  Chat {conversations.indexOf(c) + 1}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
