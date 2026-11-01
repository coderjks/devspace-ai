"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CircleHelp,
  GitBranch,
  Github,
  KeyRound,
  Laptop,
  Send,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

function Code({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{children}</code>;
}

export default function HelpPage() {
  const [me, setMe] = useState<{ email: string } | null>(null);

  useEffect(() => {
    api<{ email: string }>("/api/auth/me").then(setMe).catch(() => {});
  }, []);

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Resources</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Help & setup</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        New here and never touched Git? Start at Step 1 and work down — by Step 4
        you&apos;ll have your sprint repo and know how to submit work.
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
            <p>Email: <Code>demo@devspace.ai</Code></p>
            <p>Password: <Code>DemoPass123!</Code></p>
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
              <Laptop size={16} aria-hidden /> Step 1 — Install Git
            </CardTitle>
            <CardDescription>Git tracks your code changes. Install it once per machine.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li><strong>Mac:</strong> open Terminal and run <Code>xcode-select --install</Code>. If it says already installed, you&apos;re done.</li>
              <li><strong>Windows:</strong> install <a className="font-medium text-primary hover:underline" href="https://git-scm.com/download/win" target="_blank" rel="noreferrer">Git for Windows</a> (accept defaults), then use <strong>Git Bash</strong> as your terminal.</li>
              <li><strong>Linux (Ubuntu/Debian):</strong> run <Code>sudo apt update &amp;&amp; sudo apt install -y git</Code>.</li>
            </ul>
            <p>Check it worked: <Code>git --version</Code> — you should see a version number like <Code>git version 2.4x</Code>.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound size={16} aria-hidden /> Step 2 — Create a GitHub account
            </CardTitle>
            <CardDescription>GitHub hosts your code and runs the checks that grade your work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
              <li>Go to <a className="font-medium text-primary hover:underline" href="https://github.com/signup" target="_blank" rel="noreferrer">github.com/signup</a> and create a free account.</li>
              <li>Verify your email address (GitHub sends a code).</li>
              <li>Tell Git who you are — run once in your terminal:
                <div className="mt-1.5 space-y-1">
                  <div><Code>git config --global user.name &quot;Your Name&quot;</Code></div>
                  <div><Code>git config --global user.email &quot;you@example.com&quot;</Code></div>
                </div>
              </li>
            </ol>
            <p className="text-muted-foreground">Use the same email you used for GitHub so your commits link to your account.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Github size={16} aria-hidden /> Step 3 — Get your sprint repo
            </CardTitle>
            <CardDescription>You never work directly in the base repo — you get your own copy (a fork).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
              <li>Open the <Link href="/github" className="font-medium text-primary hover:underline">GitHub page</Link> — it shows the base repository and a <strong>Fork … on GitHub →</strong> link. Click it, then press <strong>Create fork</strong>.</li>
              <li>Back on the <Link href="/github" className="font-medium text-primary hover:underline">GitHub page</Link>, link <strong>your fork</strong> (format <Code>your-username/repo-name</Code>) — not the base repo.</li>
              <li>Download your fork to your machine:
                <div className="mt-1.5"><Code>git clone https://github.com/YOUR-USERNAME/REPO-NAME.git</Code></div>
              </li>
              <li>Move into it: <Code>cd REPO-NAME</Code></li>
            </ol>
            <p className="text-muted-foreground">Why a fork? Your fork is yours alone — you literally cannot push into another intern&apos;s work, so everyone&apos;s sprint is safe.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch size={16} aria-hidden /> Step 4 — Do sprint work & submit
            </CardTitle>
            <CardDescription>One branch per task, one pull request per branch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
              <li>Pick a ticket on the <Link href="/board" className="font-medium text-primary hover:underline">Board</Link> and make a branch for it:
                <div className="mt-1.5"><Code>git checkout -b task/AI-001-short-name</Code></div>
              </li>
              <li>Do the work, then save it:
                <div className="mt-1.5 space-y-1">
                  <div><Code>git add .</Code></div>
                  <div><Code>git commit -m &quot;feat: describe what you built&quot;</Code></div>
                  <div><Code>git push -u origin task/AI-001-short-name</Code></div>
                </div>
              </li>
              <li>On GitHub, open a <strong>pull request from your fork</strong> against the base repository. Link the PR on the <Link href="/github" className="font-medium text-primary hover:underline">GitHub page</Link>.</li>
              <li>Automated checks run, then you get AI review feedback. If changes are requested, commit fixes to the <strong>same branch</strong> and push again — the PR updates itself.</li>
              <li>Once checks and review pass, the task is approved and the next one unlocks on your <Link href="/progression" className="font-medium text-primary hover:underline">Progression</Link> path.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send size={16} aria-hidden /> Everyday rhythm
            </CardTitle>
            <CardDescription>The habits that keep your internship smooth.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Post your <Link href="/standup" className="font-medium text-primary hover:underline">daily standup</Link> (text or <Link href="/voice" className="font-medium text-primary hover:underline">voice</Link>) before starting work.</li>
              <li>Stuck? Ask a teammate in <Link href="/team" className="font-medium text-primary hover:underline">Team chat</Link> — start with the Tech Lead for code, QA Engineer for tests.</li>
              <li>Before each session: <Code>git pull</Code> on your branch to stay up to date.</li>
              <li>Running DevSpace itself locally (Docker, Python, Node)? The full zero-to-running guide is <Code>docs/setup-guide.md</Code> in the repository.</li>
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
              <li><strong>Login says “failed to fetch”:</strong> the API isn&apos;t up — ask whoever runs your DevSpace instance to check it.</li>
              <li><strong>“Permission denied” on push:</strong> you&apos;re pushing to the base repo, not your fork — check <Code>git remote -v</Code> shows your username in the URL.</li>
              <li><strong>PR submitted but nothing happens:</strong> your fork isn&apos;t linked — link it on the <Link href="/github" className="font-medium text-primary hover:underline">GitHub page</Link>, then resubmit.</li>
              <li><strong>“Address already in use”</strong> (local setup): run <Code>./scripts/dev.sh stop</Code>, then start again.</li>
              <li><strong>Page loads as unstyled text</strong> (local setup): stop, delete the <Code>web/.next</Code> folder, start again.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
