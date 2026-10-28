import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  GitPullRequest,
  Mic,
  Play,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "./section";
import { WorkspacePreview } from "./workspace-preview";

const BENEFITS = [
  { icon: GitPullRequest, title: "Real GitHub workflows", text: "PRs, reviews, and SHA-pinned checks" },
  { icon: Mic, title: "Voice standups", text: "Push-to-talk with text fallback" },
  { icon: Play, title: "Structured learning", text: "Hints and remediation, never solutions" },
];

export function Hero() {
  return (
    <section aria-label="Introduction" className="relative overflow-hidden border-b border-border">
      {/* Backdrop: soft token glows + faint grid, hero only. */}
      <div aria-hidden className="glow-conic absolute inset-0" />
      <div aria-hidden className="bg-blueprint absolute inset-0" />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-16 pt-14 md:pt-20 lg:grid-cols-[1fr_1.15fr] lg:gap-10 lg:pb-24 lg:pt-24">
        <div>
          <p
            className="enter-rise inline-flex items-center gap-2 rounded-full border border-border bg-card/80 py-1 pl-1.5 pr-3 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur"
            style={{ "--enter-delay": "0ms" } as React.CSSProperties}
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              <Sparkles size={12} aria-hidden /> Simulated workplace
            </span>
            Real GitHub PRs · AI reviews · Voice standups
          </p>
          <div className="enter-rise mt-5" style={{ "--enter-delay": "70ms" } as React.CSSProperties}>
            <Eyebrow>The AI-native engineering internship</Eyebrow>
          </div>
          <h1
            className="enter-rise mt-4 text-balance text-[2.75rem] font-extrabold leading-[1.04] tracking-tight text-foreground md:text-6xl md:leading-[1.02]"
            style={{ "--enter-delay": "140ms" } as React.CSSProperties}
          >
            Your First
            <br />
            Engineering Team.
            <br />
            <span className="text-primary">Powered by AI.</span>
          </h1>
          <p
            className="enter-rise mt-6 max-w-lg text-pretty text-lg leading-8 text-muted-foreground"
            style={{ "--enter-delay": "210ms" } as React.CSSProperties}
          >
            Experience real engineering workflows, collaborate with AI teammates, ship code through
            GitHub pull requests, and build the skills that turn students into job-ready developers.
          </p>
          <div
            className="enter-rise mt-8 flex flex-wrap gap-3"
            style={{ "--enter-delay": "280ms" } as React.CSSProperties}
          >
            <Button size="lg" asChild>
              <Link href="/onboarding">
                Start Your Internship <ArrowRight size={18} aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#experience">Explore the Experience</Link>
            </Button>
          </div>
          <ul
            className="enter-rise mt-10 grid gap-x-6 gap-y-5 sm:grid-cols-3"
            style={{ "--enter-delay": "350ms" } as React.CSSProperties}
          >
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm">
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
        <div
          className="enter-rise relative"
          style={{ "--enter-delay": "300ms" } as React.CSSProperties}
        >
          {/* Ambient layer behind the preview. */}
          <div
            aria-hidden
            className="absolute -inset-6 rounded-[1.75rem] bg-gradient-to-br from-primary/15 via-transparent to-info/15 blur-2xl"
          />
          <div className="relative">
            <WorkspacePreview />
          </div>
          {/* Floating proof cards (decorative; the preview carries the accessible label). */}
          <div
            aria-hidden
            className="enter-rise absolute -left-4 top-10 hidden items-center gap-2.5 rounded-xl border border-border bg-card/95 px-3.5 py-3 shadow-lift backdrop-blur xl:flex"
            style={{ "--enter-delay": "520ms" } as React.CSSProperties}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15 text-success">
              <CheckCircle2 size={16} />
            </span>
            <span>
              <span className="block text-xs font-semibold text-foreground">PR #42 approved</span>
              <span className="block text-[11px] text-muted-foreground">All checks passed · SHA pinned</span>
            </span>
          </div>
          <div
            aria-hidden
            className="enter-rise absolute -right-3 bottom-12 hidden items-center gap-2.5 rounded-xl border border-border bg-card/95 px-3.5 py-3 shadow-lift backdrop-blur xl:flex"
            style={{ "--enter-delay": "620ms" } as React.CSSProperties}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Mic size={16} />
            </span>
            <span>
              <span className="block text-xs font-semibold text-foreground">Standup confirmed</span>
              <span className="block text-[11px] text-muted-foreground">Blocker shared with Tech Lead</span>
            </span>
          </div>
        </div>
      </div>
      <p className="relative mx-auto w-full max-w-7xl px-6 pb-4 text-xs text-muted-foreground">
        Dashboard preview uses illustrative sample data — not live student work.
      </p>
    </section>
  );
}
