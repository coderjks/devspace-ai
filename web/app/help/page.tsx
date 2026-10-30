"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, CircleHelp, TerminalSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

export default function HelpPage() {
  const [me, setMe] = useState<{ email: string } | null>(null);

  useEffect(() => {
    api<{ email: string }>("/api/auth/me").then(setMe).catch(() => {});
  }, []);

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Resources</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Help & setup</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Everything a newcomer needs: first login, daily commands, and fixes for common problems.
        The full zero-to-running guide (including Git installation) lives in{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">docs/setup-guide.md</code> in the repository.
      </p>
      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen size={16} aria-hidden /> First login
            </CardTitle>
            <CardDescription>Use the demo account — no signup needed to explore.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Email: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">demo@devspace.ai</code></p>
            <p>Password: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">DemoPass123!</code></p>
            <p className="text-muted-foreground">
              Suggested tour: <Link href="/dashboard" className="font-medium text-primary hover:underline">Dashboard</Link>
              {" → "}<Link href="/board" className="font-medium text-primary hover:underline">Board</Link>
              {" → "}<Link href="/team" className="font-medium text-primary hover:underline">Team chat</Link>
              {" → "}<Link href="/standup" className="font-medium text-primary hover:underline">Standup</Link>
              {" → "}<Link href="/github" className="font-medium text-primary hover:underline">GitHub</Link>
              {" → "}<Link href="/voice" className="font-medium text-primary hover:underline">Voice</Link>
              {" → "}<Link href="/progression" className="font-medium text-primary hover:underline">Progression</Link>.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TerminalSquare size={16} aria-hidden /> Everyday commands
            </CardTitle>
            <CardDescription>Run from the project folder in your terminal.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-xs">./scripts/dev.sh</code> <span className="text-muted-foreground">— start everything (database, API, website)</span></li>
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-xs">./scripts/dev.sh status</code> <span className="text-muted-foreground">— check what is running</span></li>
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-xs">./scripts/dev.sh stop</code> <span className="text-muted-foreground">— stop the servers</span></li>
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-xs">git pull</code> <span className="text-muted-foreground">— get the latest code</span></li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleHelp size={16} aria-hidden /> Common fixes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li><strong>Login says “failed to fetch”:</strong> the API isn&apos;t up — run <code className="rounded bg-muted px-1 py-0.5 text-xs">./scripts/dev.sh status</code>, then check <code className="rounded bg-muted px-1 py-0.5 text-xs">/tmp/devspace/api.log</code>.</li>
              <li><strong>“Address already in use”:</strong> run <code className="rounded bg-muted px-1 py-0.5 text-xs">./scripts/dev.sh stop</code>, then start again.</li>
              <li><strong>Page loads as unstyled text:</strong> stop, delete the <code className="rounded bg-muted px-1 py-0.5 text-xs">web/.next</code> folder, start again.</li>
              <li><strong>Database errors after a fresh install:</strong> make sure Docker Desktop is running (whale icon), then retry.</li>
              <li><strong>New machine?</strong> Install Git, Docker Desktop, Python 3.12+, Node 20 — then follow <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/setup-guide.md</code> step by step.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
