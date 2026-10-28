import { ArrowRight, MessagesSquare, KanbanSquare, GitPullRequest, Trophy, type LucideIcon } from "lucide-react";
import { Section } from "./section";

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: MessagesSquare,
    title: "Join Your Engineering Team",
    text: "Create your profile, set your goals, and meet your AI teammates.",
  },
  {
    icon: KanbanSquare,
    title: "Pick Up Real Sprint Tasks",
    text: "Work on authentic engineering tickets in a simulated product.",
  },
  {
    icon: GitPullRequest,
    title: "Collaborate with AI Teammates",
    text: "Get guidance, code reviews, and support from your AI team.",
  },
  {
    icon: Trophy,
    title: "Ship Code and Grow Your Skills",
    text: "Submit real pull requests, complete sprints, and track your progress.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="From Student to Software Engineer"
      description="A hands-on, project-based learning experience with your own AI engineering team."
    >
      <ol className="grid gap-4 md:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground" aria-hidden>
                {i + 1}
              </span>
              <s.icon size={22} aria-hidden className="text-primary" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-foreground">{s.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.text}</p>
            {i < STEPS.length - 1 ? (
              <ArrowRight size={16} aria-hidden className="absolute -right-3.5 top-1/2 hidden -translate-y-1/2 text-muted-foreground/50 md:block" />
            ) : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}
