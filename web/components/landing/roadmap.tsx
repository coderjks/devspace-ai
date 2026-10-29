import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "./section";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

// Mirrors curriculum/roadmap-12wk.json (week 1 is the fully specified sprint).
const WEEKS = [
  { week: 1, title: "Support Backend Foundations", status: "active" },
  { week: 2, title: "API Design and Validation", status: "upcoming" },
  { week: 3, title: "PostgreSQL in Practice", status: "upcoming" },
  { week: 4, title: "Authentication and Authorization", status: "upcoming" },
  { week: 5, title: "LLM Integration Patterns", status: "upcoming" },
  { week: 6, title: "Retrieval-Augmented Generation", status: "upcoming" },
  { week: 7, title: "Tool Use and Agents", status: "upcoming" },
  { week: 8, title: "Testing and Evaluation", status: "upcoming" },
  { week: 9, title: "Observability and Monitoring", status: "upcoming" },
  { week: 10, title: "Security and Privacy", status: "upcoming" },
  { week: 11, title: "Capstone Project", status: "upcoming" },
  { week: 12, title: "Portfolio and Demo", status: "upcoming" },
];

export function Roadmap() {
  return (
    <Section
      id="roadmap"
      eyebrow="Internship roadmap"
      title="A 12-Week Applied AI Engineering Journey"
      description="Week 1 is a fully specified six-ticket sprint available in the app today. Later weeks outline the progression path — explore the full roadmap after signing in."
      tone="muted"
    >
      <Reveal>
        <ol className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WEEKS.map((w) => (
            <li
              key={w.week}
              className={cn(
                "relative flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-soft transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift",
                w.status === "active" ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold",
                  w.status === "active"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {w.week}
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {w.title}
                  {w.status === "active" ? (
                    <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 align-middle text-[11px] font-medium text-success">
                      In app now
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Week {w.week} of 12</span>
              </span>
            </li>
          ))}
        </ol>
      </Reveal>
      <Reveal delay={120} className="mt-8 text-center">
        <Link
          href="/roadmap"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Explore the full roadmap
          <ArrowRight size={16} aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </Reveal>
    </Section>
  );
}
