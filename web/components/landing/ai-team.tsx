import {
  Compass,
  DraftingCompass,
  FlaskConical,
  GraduationCap,
  LifeBuoy,
  RefreshCcw,
  type LucideIcon,
} from "lucide-react";
import { Section } from "./section";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const ROLES: { icon: LucideIcon; role: string; text: string; assistant?: boolean }[] = [
  { icon: Compass, role: "Engineering Manager", text: "Sets direction, goals, and growth feedback" },
  { icon: DraftingCompass, role: "Tech Lead", text: "Architecture, planning, and technical guidance" },
  { icon: LifeBuoy, role: "Senior Engineer", text: "Debugging help and code-quality coaching" },
  { icon: FlaskConical, role: "QA Engineer", text: "Edge cases and acceptance-criteria coverage" },
  { icon: RefreshCcw, role: "Scrum Master", text: "Standups, blockers, and sprint rhythm" },
  {
    icon: GraduationCap,
    role: "Learning Assistant",
    text: "Concept explanations and progressive hints",
    assistant: true,
  },
];

export function AiTeam() {
  return (
    <Section
      id="ai-team"
      eyebrow="Your team"
      title="Meet Your AI Engineering Team"
      description="Work with six specialized AI roles that simulate a real software engineering team and guide you throughout your journey. One shared orchestration layer — not six separate services."
      tone="muted"
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {ROLES.map((r, i) => (
          <Reveal as="li" key={r.role} delay={(i % 3) * 90} className="h-full">
            <div
              className={cn(
                "group flex h-full flex-col rounded-2xl border bg-card p-6 shadow-soft transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lift",
                r.assistant ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105",
                  r.assistant ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                )}
              >
                <r.icon size={22} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                {r.role}
                {r.assistant ? (
                  <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 align-middle text-[11px] font-medium text-primary">
                    Tutor
                  </span>
                ) : null}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{r.text}</p>
              {r.assistant ? (
                <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                  Never supplies full solutions or hidden tests — hints only.
                </p>
              ) : null}
            </div>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
