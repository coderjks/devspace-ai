import { ChevronDown } from "lucide-react";
import { Section } from "./section";
import { Reveal } from "@/components/motion/reveal";

const FAQS = [
  {
    q: "Is DevSpace AI a real internship or a job?",
    a: "Neither. It is a simulated workplace for learning: real workflows, real code, and real feedback — but no employment, accreditation, or placement guarantee.",
  },
  {
    q: "What do I actually build?",
    a: "A customer-support backend across six ordered tickets: a ticket API, authorization, LLM summarization, retrieval, a safe order-lookup tool, and evaluation with monitoring.",
  },
  {
    q: "Do the AI teammates write my code for me?",
    a: "No. They explain, question, review, and hint. The Learning Assistant is capped at progressive hints and never supplies full solutions or hidden tests.",
  },
  {
    q: "How does grading work?",
    a: "Your pull requests run automated tests in an isolated runner and receive structured AI reviews. Tasks unlock only when the latest commit passes tests with no blocking findings.",
  },
  {
    q: "Do I need a microphone?",
    a: "No. Voice standups are push-to-talk with a full text fallback, and transcripts are editable before anything is recorded.",
  },
];

export function Faq() {
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions students ask" align="center">
      <Reveal className="mx-auto max-w-3xl">
        <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
          {FAQS.map((f) => (
            <details key={f.q} className="faq-item px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown size={17} aria-hidden className="shrink-0 text-muted-foreground" />
              </summary>
              <div>
                <p className="pb-1 pt-2 text-sm leading-6 text-muted-foreground">{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
