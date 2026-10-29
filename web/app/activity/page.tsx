"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, Inbox } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

type Standup = {
  id: string;
  task_id: string | null;
  task_key: string | null;
  yesterday: string;
  today: string;
  blockers: string;
  status: string;
  created_at: string;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function ActivityPage() {
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [standups, setStandups] = useState<Standup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<{ email: string }>("/api/auth/me"), api<Standup[]>("/api/standups")])
      .then(([meData, list]) => {
        setMe(meData);
        setStandups(list);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load activity"))
  }, []);

  const blocked = (standups ?? []).filter((s) => s.blockers.trim() && s.status === "confirmed");

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Sprint activity & blockers</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Activity</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Your confirmed standups and flagged blockers. Write today&apos;s standup to add a new entry.
      </p>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      {standups === null ? (
        <div className="mt-6 space-y-3">
          <LoadingStatus label="Loading activity…" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {blocked.length > 0 ? (
            <Card className="border-warning/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flag size={16} aria-hidden className="text-warning" /> Open blockers ({blocked.length})
                </CardTitle>
                <CardDescription>Flagged from confirmed standups. Clear them by making progress.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {blocked.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="text-muted-foreground">
                        {s.task_key ? <strong className="text-foreground">{s.task_key}</strong> : "No ticket"} — {s.blockers}
                      </span>
                      {s.task_id ? (
                        <Link href={`/tasks/${s.task_id}`} className="shrink-0 font-medium text-primary hover:underline">
                          Open ticket
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          {standups.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState icon={Inbox} title="No standups yet" hint="Write your first standup to start the activity log." />
                <p className="pb-2 text-center text-sm">
                  <Link href="/standup" className="font-medium text-primary hover:underline">Write today&apos;s standup</Link>
                </p>
              </CardContent>
            </Card>
          ) : (
            <ol className="space-y-3">
              {standups.map((s) => (
                <li key={s.id}>
                  <Card className="transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lift">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{formatWhen(s.created_at)}</span>
                        <span className="flex items-center gap-2">
                          {s.task_key ? (
                            s.task_id ? (
                              <Link href={`/tasks/${s.task_id}`} className="text-xs font-medium text-primary hover:underline">
                                {s.task_key}
                              </Link>
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground">{s.task_key}</span>
                            )
                          ) : null}
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            {s.status === "confirmed" ? "Confirmed" : "Proposed"}
                          </span>
                        </span>
                      </div>
                      <p className="text-sm"><strong>Yesterday:</strong> <span className="text-muted-foreground">{s.yesterday}</span></p>
                      <p className="text-sm"><strong>Today:</strong> <span className="text-muted-foreground">{s.today}</span></p>
                      {s.blockers.trim() ? (
                        <p className="text-sm"><strong>Blockers:</strong> <span className="text-warning">{s.blockers}</span></p>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </AppShell>
  );
}
