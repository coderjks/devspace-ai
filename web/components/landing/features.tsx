import {
  BarChart3,
  CheckCircle2,
  GitPullRequest,
  KanbanSquare,
  Mic,
  Route,
  SearchCheck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Section } from "./section";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const CHECKS = [
  { icon: CheckCircle2, text: "Required tests — 24 passed", tone: "text-success" },
  { icon: ShieldCheck, text: "Security checks — no findings", tone: "text-success" },
  { icon: SearchCheck, text: "AI review — 2 suggestions", tone: "text-warning" },
];

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: KanbanSquare,
    title: "Jira-style Sprints",
    text: "Plan and track six ordered tickets on a real Kanban board with backend-enforced transitions.",
  },
  {
    icon: Mic,
    title: "Voice Standups",
    text: "Push-to-talk check-ins with your Scrum Master, with an editable transcript and text fallback.",
  },
  {
    icon: Route,
    title: "Structured Learning",
    text: "Follow a 12-week Applied AI Engineering roadmap from APIs to evaluation and monitoring.",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    text: "Competency growth backed by evaluation evidence — never by model assertion.",
  },
];

export function Features() {
  return (
    <Section
      id="experience"
      eyebrow="Workflows"
      title="Experience Real Engineering Workflows"
      description="Everything you need to feel like a real software engineer, powered by AI."
    >
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Showcase card: PR evaluation, with a mini status mock. */}
        <Reveal className="h-full lg:col-span-2" delay={0}>
          <div className="grid h-full gap-6 rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lift sm:grid-cols-2 md:p-8">
            <div className="flex flex-col justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm">
                <GitPullRequest size={20} aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                GitHub PRs, evaluated for real
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Open pull requests against your sprint ticket. Automated tests run in an isolated
                runner, your AI team reviews the diff, and tasks unlock only when the latest commit
                passes with no blocking findings.
              </p>
            </div>
            <div aria-hidden className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="flex items-center justify-between text-xs font-semibold text-foreground">
                PR #42 · AI-001 ticket API
                <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
                  In review
                </span>
              </p>
              <ul className="mt-3 space-y-2">
                {CHECKS.map((c) => (
                  <li
                    key={c.text}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground"
                  >
                    <c.icon size={14} className={cn("shrink-0", c.tone)} />
                    {c.text}
                  </li>
                ))}
              </ul>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-info" />
              </div>
              <p className="mt-1.5 text-right text-[11px] text-muted-foreground">SHA 9f3a…c21d pinned</p>
            </div>
          </div>
        </Reveal>
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={((i + 1) % 3) * 90} className="h-full">
            <div className="group flex h-full gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lift">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm transition-transform duration-200 group-hover:scale-105">
                <f.icon size={20} aria-hidden />
              </span>
              <span>
                <h3 className="text-[15px] font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.text}</p>
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
