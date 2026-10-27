"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";

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
    <div className="min-h-screen">
      <SiteHeader email={me?.email} />
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">12-week Applied AI Engineering roadmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only Sprint 1 is fully specified for the hackathon. Later weeks are the product roadmap.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <ol className="mt-6 space-y-3">
          {roadmap?.weeks.map((w) => (
            <li key={w.week}>
              <Card>
                <CardHeader>
                  <CardTitle>Week {w.week} — {w.title}</CardTitle>
                  <CardDescription>{w.status === "active" ? "Active sprint" : "Upcoming"}</CardDescription>
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
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
