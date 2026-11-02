import { Suspense } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { BrandPanel } from "@/components/auth/brand-panel";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Sign In — DevSpace AI",
  description: "Sign in or create your DevSpace AI intern account.",
};

export default function LoginPage() {
  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground antialiased">
      <a
        href="#auth-card"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to sign in
      </a>
      <div className="grid h-full lg:grid-cols-[58fr_42fr]">
        <div className="relative hidden overflow-hidden border-r border-border lg:block">
          <div className="relative h-full overflow-y-auto">
            <BrandPanel />
          </div>
        </div>
        <main className="flex h-full items-center justify-center overflow-y-auto bg-background px-6 py-8">
          <div className="m-auto w-full max-w-md">
            <p className="mb-6 lg:hidden">
              <Link href="/" className="flex items-center gap-2" aria-label="DevSpace AI home">
                <Logo size="md" />
                <span className="text-[15px] font-bold tracking-tight text-foreground">DevSpace AI</span>
              </Link>
            </p>
            <div id="auth-card">
              <Suspense>
                <AuthCard />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
