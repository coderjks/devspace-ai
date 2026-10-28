import Link from "next/link";
import { ArrowRight, Code2, GitPullRequest, GraduationCap, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "./section";
import { WorkspacePreview } from "./workspace-preview";

const BENEFITS = [
  { icon: Code2, title: "AI Engineering Team", text: "Five teammates plus a learning assistant" },
  { icon: GitPullRequest, title: "Real GitHub Workflows", text: "PRs, reviews, and SHA-pinned checks" },
  { icon: GraduationCap, title: "Structured Learning", text: "Hints and remediation, never solutions" },
  { icon: Mic, title: "Voice Standups", text: "Push-to-talk with text fallback" },
];

export function Hero() {
  return (
    <section aria-label="Introduction" className="border-b border-border bg-accent/40">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-14 pt-14 md:pt-20 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <Eyebrow>The AI-native engineering internship</Eyebrow>
          <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-foreground md:text-[3.4rem]">
            Your First<br />
            Engineering Team.<br />
            Powered by AI.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
            Experience real engineering workflows, collaborate with AI teammates, ship code through
            GitHub pull requests, and build the skills that turn students into job-ready developers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/onboarding">
                Start Your Internship <ArrowRight size={18} aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#experience">Explore the Experience</Link>
            </Button>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <b.icon size={17} aria-hidden />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-foreground">{b.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <WorkspacePreview />
      </div>
      <p className="mx-auto w-full max-w-7xl px-6 pb-4 text-xs text-muted-foreground">
        Dashboard preview uses illustrative sample data — not live student work.
      </p>
    </section>
  );
}
