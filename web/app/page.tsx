import type { Metadata } from "next";
import { AiTeam } from "@/components/landing/ai-team";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";

export const metadata: Metadata = {
  title: "DevSpace AI — Your First Engineering Team. Powered by AI.",
  description:
    "Experience real engineering workflows, collaborate with AI teammates, ship code, and build the skills that turn students into job-ready developers.",
  openGraph: {
    title: "DevSpace AI — Your First Engineering Team. Powered by AI.",
    description:
      "An AI-native simulated engineering internship: sprint tickets, AI teammates, real GitHub PRs, and competency-based progression.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <a
        href="#how-it-works"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <AiTeam />
        <Features />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
