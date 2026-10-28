import {
  BarChart3,
  GitPullRequest,
  KanbanSquare,
  Mic,
  Route,
  SearchCheck,
  type LucideIcon,
} from "lucide-react";
import { Section } from "./section";

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: KanbanSquare,
    title: "Jira-style Sprints",
    text: "Manage tasks with a modern Kanban board",
  },
  {
    icon: GitPullRequest,
    title: "GitHub Integration",
    text: "Work with real pull requests and code",
  },
  {
    icon: SearchCheck,
    title: "AI Code Reviews",
    text: "Get actionable feedback from your AI team",
  },
  {
    icon: Mic,
    title: "Voice Standups",
    text: "Have natural conversations with your Scrum Master",
  },
  {
    icon: Route,
    title: "Structured Learning",
    text: "Follow a 12-week internship roadmap",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    text: "See skill development and achievements",
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
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <f.icon size={19} aria-hidden />
            </span>
            <span>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{f.text}</p>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
