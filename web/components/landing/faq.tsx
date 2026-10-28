import { Section } from "./section";

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
      <div className="mx-auto max-w-3xl divide-y divide-border rounded-xl border border-border bg-card">
        {FAQS.map((f) => (
          <details key={f.q} className="px-6 py-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              {f.q}
            </summary>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
