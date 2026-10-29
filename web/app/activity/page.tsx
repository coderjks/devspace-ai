"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, GitPullRequest, History, Inbox, MessagesSquare } from "lucide-react";
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

type SystemEvent = {
  id: string;
  actor: string;
  action: string;
  object_type: string | null;
  object_id: string | null;
  created_at: string;
};

type RoleComment = {
  id: string;
  persona: string;
  conversation_id: string;
  conversation_title: string;
  excerpt: string;
  created_at: string;
};

type SubmissionItem = {
  id: string;
  task_id: string;
  task_key: string | null;
  pr_number: number | null;
  head_sha: string | null;
  status: string;
  created_at: string;
};

type Feed = {
  system_events: SystemEvent[];
  role_comments: RoleComment[];
  submissions: { source: string; items: SubmissionItem[] };
};

function personaLabel(persona: string): string {
  return persona.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function ActivityPage() {
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [standups, setStandups] = useState<Standup[] | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<{ email: string }>("/api/auth/me"), api<Standup[]>("/api/standups"), api<Feed>("/api/activity")])
      .then(([meData, list, feedData]) => {
        setMe(meData);
        setStandups(list);
        setFeed(feedData);
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
          {feed !== null && feed.system_events.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History size={16} aria-hidden className="text-primary" /> Sprint timeline
                </CardTitle>
                <CardDescription>Real system events from your sprint: enrollments, task moves, standups.</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {feed.system_events.slice(0, 20).map((e) => (
                    <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <span>
                        <strong className="font-medium">{e.action}</strong>
                        <span className="text-muted-foreground"> · {e.actor}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{formatWhen(e.created_at)}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}
          {feed !== null && feed.role_comments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessagesSquare size={16} aria-hidden className="text-primary" /> Teammate comments
                </CardTitle>
                <CardDescription>Recent AI teammate replies across your conversations.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feed.role_comments.slice(0, 10).map((c) => (
                    <li key={c.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                          {personaLabel(c.persona)}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatWhen(c.created_at)}</span>
                      </div>
                      <p className="mt-1.5 text-muted-foreground">{c.excerpt}</p>
                      <Link href={`/team/${c.persona}`} className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
                        Open {c.conversation_title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          {feed !== null ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitPullRequest size={16} aria-hidden className="text-primary" /> Submissions
                </CardTitle>
                <CardDescription>GitHub pull-request submissions for your tickets.</CardDescription>
              </CardHeader>
              <CardContent>
                {feed.submissions.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No submissions yet. Connect a repository and open a pull request in Phase 05 (GitHub Integration)
                    and it will appear here automatically — this section is already wired to live data.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {feed.submissions.items.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                        <span>
                          {s.task_key ? <strong>{s.task_key}</strong> : "Ticket"}
                          {s.pr_number ? <span className="text-muted-foreground"> · PR #{s.pr_number}</span> : null}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{s.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
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
