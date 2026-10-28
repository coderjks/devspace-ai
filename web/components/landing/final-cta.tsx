import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section aria-label="Get started" className="mx-auto w-full max-w-7xl px-6 py-16 md:py-24">
      <div className="rounded-xl border border-border bg-card px-6 py-14 text-center md:py-16">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Stop Just Learning to Code. Start Engineering.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Step into your virtual engineering team and experience what building software together
          actually feels like.
        </p>
        <div className="mt-8">
          <Button size="lg" asChild>
            <Link href="/onboarding">
              Start Your Internship <ArrowRight size={18} aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
