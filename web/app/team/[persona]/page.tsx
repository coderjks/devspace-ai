"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
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

  const loadMessages = useCallback(
    async (convId: string | null) => {
      if (!convId) {
        setMessages([]);
        return;
      }
      const list = await api<Message[]>(`/api/agents/conversations/${convId}/messages`);
      setMessages(list);
    },
    []
  );

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
    // Optimistic user bubble; replaced by the authoritative fetch below.
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content, created_at: "" }]);
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {meta?.kind === "assistant" ? "Learning support" : "Teammate"}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
              {meta?.name ?? PERSONA_LABELS[persona]}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{meta?.responsibilities}</p>
            {isMock ? (
              <p className="mt-2 inline-block rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                Simulated replies — mock mode, no live model
              </p>
            ) : null}
          </div>
          <Card>
            <CardContent className="space-y-4 p-4 md:p-6">
              {error ? (
                <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <div aria-live="polite" className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm leading-6",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-muted/50 text-foreground"
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {messages.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No messages yet — say hello to start the conversation.
                  </p>
                ) : null}
                {sending ? (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
                      <Loader2 size={15} aria-hidden className="animate-spin" /> Replying…
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <label htmlFor="chat-input" className="sr-only">Message {PERSONA_LABELS[persona]}</label>
                <Input
                  id="chat-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${PERSONA_LABELS[persona]}…`}
                  maxLength={4000}
                  disabled={sending}
                />
                <Button type="submit" disabled={sending || !draft.trim()} aria-busy={sending}>
                  {sending ? <Loader2 size={16} aria-hidden className="animate-spin" /> : <Send size={16} aria-hidden />}
                  <span className="sr-only">Send</span>
                </Button>
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
