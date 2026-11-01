"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { TeammateAvatar } from "@/components/ui/teammate-avatar";
import { ChatPanel } from "@/components/chat-panel";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; role: string; responsibilities: string; kind: string };

export function TeamChat({ initialPersona, youName }: { initialPersona?: string; youName: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialPersona ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ members: Member[] }>("/api/team")
      .then((team) => {
        setMembers(team.members);
        if (!initialPersona) setSelectedId(team.members[0]?.id ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load team"))
      .finally(() => setLoading(false));
  }, [initialPersona]);

  useEffect(() => {
    if (initialPersona) setSelectedId(initialPersona);
  }, [initialPersona]);

  const selected = members.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="mt-4 grid min-h-[65vh] gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="lg:sticky lg:top-4 lg:max-h-[75vh] lg:overflow-y-auto">
        <CardContent className="p-2">
          {loading ? (
            <div className="space-y-2 p-2">
              <LoadingStatus label="Loading team…" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : (
            <ul aria-label="Team members" className="space-y-1">
              {members.map((m) => {
                const active = m.id === selectedId;
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => setSelectedId(m.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        active ? "bg-accent" : "hover:bg-muted/60"
                      )}
                    >
                      <span className="relative">
                        <TeammateAvatar name={m.name} seed={m.id} animate={false} />
                        <span aria-hidden className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{m.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{m.role}</span>
                      </span>
                      {m.kind === "assistant" ? (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Tutor</span>
                      ) : null}
                      <ChevronRight size={15} aria-hidden className="shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="min-h-[65vh] lg:max-h-[75vh] lg:overflow-hidden">
        <CardContent className="flex h-full min-h-[65vh] flex-col p-0 lg:max-h-[75vh]">
          {error ? (
            <p role="alert" className="m-4 text-sm text-destructive">{error}</p>
          ) : selected ? (
            <ChatPanel
              key={selected.id}
              persona={selected.id}
              teammateName={selected.name}
              teammateRole={selected.role}
              responsibilities={selected.responsibilities}
              youName={youName}
            />
          ) : (
            !loading ? <p className="m-auto text-sm text-muted-foreground">Select a teammate to start chatting.</p> : null
          )}
        </CardContent>
      </Card>
    </div>
  );
}
