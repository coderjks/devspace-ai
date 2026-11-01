"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Lock, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Week = { week: number; title: string; summary: string; status: string };
type Roadmap = { track: string; weeks: Week[]; current_sprint: { name: string; tasks: { key: string; title: string }[] } | null };
type Me = { email: string };

export default function RoadmapPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Me>("/api/auth/me"), api<Roadmap>("/api/roadmap")])
      .then(([meData, rm]) => {
        setMe(meData);
        setRoadmap(rm);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load roadmap"));
  }, []);

  return (
    <AppShell email={me?.email}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Internship journey</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">12-week Applied AI Engineering roadmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only Sprint 1 is fully specified for the hackathon. Later weeks are the product roadmap.
        </p>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <ol className="relative mt-6 space-y-4 before:absolute before:bottom-6 before:left-[15px] before:top-6 before:w-px before:bg-border">
          {roadmap?.weeks.map((w, i) => {
            const active = w.status === "active";
            return (
              <Reveal as="li" key={w.week} delay={Math.min(i, 8) * 60} className="relative flex gap-4">
                <span
                  aria-hidden
                  className={cn(
                    "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  {active ? <Check size={15} /> : <span className="tabular-nums">{w.week}</span>}
                </span>
                <Card className={cn("min-w-0 flex-1", active && "border-primary/40 shadow-soft")}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          <MapPin size={13} aria-hidden /> You are here
                        </span>
                      ) : (
                        <Lock size={15} aria-hidden className="shrink-0 text-muted-foreground" />
                      )}
                      Week {w.week} — {w.title}
                    </CardTitle>
                    <CardDescription>{active ? "Active sprint" : "Planned — not yet available"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{w.summary}</p>
                    {w.week === 1 && roadmap.current_sprint ? (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                        {roadmap.current_sprint.tasks.map((t) => (
                          <li key={t.key}>{t.key} — {t.title}</li>
                        ))}
                      </ul>
                    ) : null}
                    {w.week === 1 ? (
                      <Link href="/board" className="mt-3 inline-block text-sm font-medium underline">Open the sprint board</Link>
                    ) : null}
                  </CardContent>
                </Card>
              </Reveal>
            );
          })}
        </ol>
    </AppShell>
  );
}
