"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ClipboardCheck, GraduationCap, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

type CheckIn = { summary: string; highlights: string[]; next_steps: string[]; source: string };
type Retro = {
  standups_confirmed: number;
  submissions: number;
  evaluations: number;
  approvals: number;
  denials: number;
  open_blockers: string[];
  notes: string[];
};
type Note = { id: string; action: string; detail: string; created_at: string };
type Week = { week: number; title: string; summary: string; status: string };

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function LearningPage() {
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [checkin, setCheckin] = useState<CheckIn | null>(null);
  const [retro, setRetro] = useState<Retro | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ email: string }>("/api/auth/me"),
      api<CheckIn>("/api/progress/check-in"),
      api<Retro>("/api/progress/retrospective"),
      api<Note[]>("/api/notifications"),
      api<{ weeks: Week[] }>("/api/roadmap"),
    ])
      .then(([meData, ci, rt, ns, rm]) => {
        setMe(meData);
        setCheckin(ci);
        setRetro(rt);
        setNotes(ns);
        setWeeks(rm.weeks);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load learning progress"));
  }, []);

  const loaded = checkin !== null && retro !== null && notes !== null && weeks !== null;

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Learning roadmap & competencies</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Learning</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Everything here is derived from your actual records — approvals, evaluations, standups. Nothing is
        self-reported or fabricated.
      </p>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      {!loaded ? (
        <div className="mt-6 space-y-3">
          <LoadingStatus label="Loading learning progress…" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck size={16} aria-hidden /> Engineering Manager check-in
              </CardTitle>
              <CardDescription>{checkin.source === "deterministic" ? "Generated from your records, not a model." : checkin.source}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium">{checkin.summary}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {checkin.highlights.map((h) => <li key={h}>{h}</li>)}
              </ul>
              <p className="pt-1 text-sm font-medium">Next steps:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {checkin.next_steps.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History size={16} aria-hidden /> Sprint retrospective
              </CardTitle>
              <CardDescription>
                {retro.standups_confirmed} standups · {retro.submissions} submissions · {retro.evaluations} evaluations ·{" "}
                {retro.approvals} approved · {retro.denials} denied
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {retro.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
              {retro.open_blockers.length > 0 ? (
                <div>
                  <p className="text-sm font-medium">Open blockers:</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-warning">
                    {retro.open_blockers.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell size={16} aria-hidden /> Notifications
              </CardTitle>
              <CardDescription>Latest decisions and replies, derived from the audit log.</CardDescription>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <EmptyState icon={Bell} title="All quiet" hint="Approvals, evaluations, and teammate replies will appear here." />
              ) : (
                <ul className="space-y-2">
                  {notes.map((n) => (
                    <li key={n.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <span>{n.detail}</span>
                      <span className="text-xs text-muted-foreground">{formatWhen(n.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap size={16} aria-hidden /> 12-week journey
              </CardTitle>
              <CardDescription>Sprint 1 is live; later weeks are the planned curriculum.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-wrap gap-2">
                {weeks.map((w) => (
                  <li key={w.week} className={`rounded-full px-3 py-1.5 text-xs font-medium ${w.status === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    W{w.week}: {w.title}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm">
                <Link href="/roadmap" className="font-medium text-primary hover:underline">Open the full roadmap →</Link>
                {" · "}
                <Link href="/progression" className="font-medium text-primary hover:underline">Skill evidence →</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
