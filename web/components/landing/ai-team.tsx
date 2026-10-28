import { Section } from "./section";

const ROLES = [
  { initial: "E", role: "Engineering Manager", text: "Sets direction and helps you grow" },
  { initial: "T", role: "Tech Lead", text: "Provides technical guidance and reviews" },
  { initial: "S", role: "Senior Engineer", text: "Helps with architecture and best practices" },
  { initial: "Q", role: "QA Engineer", text: "Reviews code and ensures quality" },
  { initial: "S", role: "Scrum Master", text: "Runs standups and keeps you on track" },
  { initial: "L", role: "Learning Assistant", text: "Provides personalized learning support", assistant: true },
];

export function AiTeam() {
  return (
    <Section
      id="ai-team"
      eyebrow="Your team"
      title="Meet Your AI Engineering Team"
      description="Work with six specialized AI roles that simulate a real software engineering team and guide you throughout your journey. One shared orchestration layer — not six separate services."
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map((r) => (
          <li
            key={r.role}
            className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center"
          >
            <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-bold text-accent-foreground">
              {r.initial}
            </span>
            <h3 className="mt-3 text-sm font-semibold text-foreground">{r.role}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{r.text}</p>
            {r.assistant ? (
              <p className="mt-2 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                Tutor — never supplies full solutions
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}
