"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronRight, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { TeammateAvatar } from "@/components/ui/teammate-avatar";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; role: string; responsibilities: string; kind: string };
type Me = { email: string };

const VOICE_PERSONAS = new Set(["tech-lead", "scrum-master"]);

export default function TeamPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api<Me>("/api/auth/me"), api<{ members: Member[] }>("/api/team")])
      .then(([meData, team]) => {
        setMe(meData);
        setMembers(team.members);
        setSelectedId(team.members[0]?.id ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load team"))
      .finally(() => setLoading(false));
  }, []);

  const selected = members.find((m) => m.id === selectedId) ?? null;

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Direct messages</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Your virtual team</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Five AI teammates plus a separate Learning Assistant. Pick a teammate to see what they do, then open the chat.
      </p>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      {loading ? (
        <div className="mt-6 space-y-3">
          <LoadingStatus label="Loading team…" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardContent className="p-2">
              <ul aria-label="Team members" className="space-y-1">
                {members.map((m, i) => {
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
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">tutor</span>
                        ) : null}
                        <ChevronRight size={15} aria-hidden className="shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <Card aria-live="polite">
            <CardContent className="space-y-4 p-5 md:p-6">
              {selected ? (
                <>
                  <div className="flex items-start gap-4">
                    <TeammateAvatar name={selected.name} seed={selected.id} size="lg" delay={members.indexOf(selected) * 0.4} />
                    <div className="min-w-0">
                      <h2 className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight">
                        {selected.name}
                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                          active now
                        </span>
                      </h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {selected.role} · {selected.kind === "assistant" ? "Learning support" : "Teammate"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{selected.responsibilities}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href={`/team/${selected.id}`}>Open chat <ArrowRight size={15} aria-hidden /></Link>
                    </Button>
                    {VOICE_PERSONAS.has(selected.id) ? (
                      <Button variant="outline" asChild>
                        <Link href="/voice"><Mic size={15} aria-hidden /> Talk by voice</Link>
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">Select a teammate to see details.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
