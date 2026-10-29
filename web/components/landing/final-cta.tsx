import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

export function FinalCta() {
  return (
    <section aria-label="Get started" className="mx-auto w-full max-w-7xl px-6 py-16 md:py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card px-6 py-14 text-center shadow-lift md:py-20">
          <div aria-hidden className="glow-conic absolute inset-0" />
          <div
            aria-hidden
            className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-extrabold tracking-tight text-foreground md:text-5xl md:leading-[1.05]">
              Stop Just Learning to Code. <span className="text-primary">Start Engineering.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
              Step into your virtual engineering team and experience what building software together
              actually feels like.
            </p>
            <div className="mt-9">
              <Button size="lg" asChild>
                <Link href="/onboarding">
                  Start Your Internship <ArrowRight size={18} aria-hidden />
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              A simulated learning environment — not employment or accredited training.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
