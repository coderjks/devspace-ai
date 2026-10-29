"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

type Progress = {
  total_tasks: number;
  by_status: Record<string, number>;
  completed_tasks: number;
  started_tasks: number;
  enrollments: { track: string; status: string; skill_level: string }[];
  recent_events: { action: string; object_type: string | null; payload: Record<string, string>; created_at: string }[];
};
type Me = { email: string; full_name: string };

export default function ProgressPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Me>("/api/auth/me"), api<Progress>("/api/progress")])
      .then(([meData, p]) => {
        setMe(meData);
        setProgress(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load progress"));
  }, []);

  return (
    <AppShell email={me?.email}>
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every number below is derived from persisted records.</p>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {progress ? (
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader><CardTitle>{progress.total_tasks}</CardTitle><CardDescription>Total sprint tasks</CardDescription></CardHeader>
              </Card>
              <Card>
                <CardHeader><CardTitle>{progress.started_tasks}</CardTitle><CardDescription>In progress</CardDescription></CardHeader>
              </Card>
              <Card>
                <CardHeader><CardTitle>{progress.completed_tasks}</CardTitle><CardDescription>Approved</CardDescription></CardHeader>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Tasks by status</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {Object.entries(progress.by_status).map(([s, n]) => (
                    <li key={s} className="flex justify-between py-2">
                      <span>{s.replace("_", " ")}</span><span className="font-medium">{n}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
              <CardContent>
                {progress.recent_events.length ? (
                  <ul className="divide-y text-sm">
                    {progress.recent_events.map((e, i) => (
                      <li key={i} className="py-2">
                        <span className="font-medium">{e.action}</span>
                        {e.payload?.key ? <span className="text-muted-foreground"> · {e.payload.key}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No activity yet — enroll and start a ticket.</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
    </AppShell>
  );
}
