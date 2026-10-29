import { KanbanSquare, GitPullRequest, MessagesSquare, Trophy, type LucideIcon } from "lucide-react";
import { Section } from "./section";
import { Reveal } from "@/components/motion/reveal";

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
      <ol className="relative grid gap-4 md:grid-cols-4 md:gap-5">
        {/* Connector line behind the step markers (desktop only). */}
        <span
          aria-hidden
          className="absolute left-[12%] right-[12%] top-11 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
        />
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.title} delay={i * 90} className="h-full">
            <div className="group relative h-full rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lift">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-info text-sm font-extrabold text-primary-foreground shadow-soft"
                >
                  {i + 1}
                </span>
                <s.icon size={22} aria-hidden className="text-primary" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.text}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
