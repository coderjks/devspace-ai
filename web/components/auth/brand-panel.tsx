import Link from "next/link";
import { BarChart3, Code2, GitPullRequest, Mic, Users } from "lucide-react";
import { Eyebrow } from "@/components/landing/section";
import { WorkspaceMiniPreview } from "./workspace-mini-preview";

const FEATURES = [
  { icon: Users, title: "AI Engineering Team", text: "Collaborate with 6 specialized AI roles" },
  { icon: Code2, title: "Real Engineering Workflows", text: "Jira-style sprints and GitHub pull requests" },
  { icon: BarChart3, title: "Structured Learning Path", text: "A 12-week Applied AI Engineering journey" },
  { icon: Mic, title: "Voice Standups", text: "Have natural conversations with your AI Scrum Master" },
];

export function BrandPanel() {
  return (
    <div className="relative flex min-h-full flex-col justify-center overflow-hidden bg-accent/40 px-6 py-10 md:px-12">
      <div aria-hidden className="glow-conic absolute inset-0" />
      <div className="relative">
      <Link href="/" className="enter-rise flex items-center gap-2" aria-label="DevSpace AI home" style={{ "--enter-delay": "0ms" } as React.CSSProperties}>
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
          D
        </span>
        <span className="text-[15px] font-bold tracking-tight text-foreground">DevSpace AI</span>
      </Link>
      <div className="enter-rise mt-8" style={{ "--enter-delay": "80ms" } as React.CSSProperties}>
        <Eyebrow>The AI-native engineering internship</Eyebrow>
        <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground xl:text-5xl">
          Join Your<br />
          Engineering Team.<br />
          <span className="text-primary">Start Building Real Skills.</span>
        </h2>
        <p className="mt-5 max-w-md text-pretty text-[15px] leading-7 text-muted-foreground">
          Work on real engineering projects with AI teammates. Solve sprint tasks, get code reviews,
          participate in standups, and build a portfolio that gets you job-ready.
        </p>
      </div>
      </div>
      <ul className="relative mt-8 space-y-4">
        {FEATURES.map((f, i) => (
          <li
            key={f.title}
            className="enter-rise flex gap-3"
            style={{ "--enter-delay": `${160 + i * 70}ms` } as React.CSSProperties}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm">
              <f.icon size={17} aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">{f.title}</span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">{f.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="enter-rise relative mt-8" style={{ "--enter-delay": "440ms" } as React.CSSProperties}>
        <WorkspaceMiniPreview />
        <p className="mt-2 text-xs text-muted-foreground">Illustrative preview with sample data.</p>
      </div>
      <div className="enter-rise relative mt-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft" style={{ "--enter-delay": "520ms" } as React.CSSProperties}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/15 text-info">
          <GitPullRequest size={19} aria-hidden />
        </span>
        <p className="text-[13px] leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">Every review ties to a real commit.</span>{" "}
          Evaluations pin the exact PR SHA, so feedback always refers to code you actually pushed.
        </p>
      </div>
    </div>
  );
}
