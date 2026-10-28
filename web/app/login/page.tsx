import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { BrandPanel } from "@/components/auth/brand-panel";

export const metadata = {
  title: "Sign In — DevSpace AI",
  description: "Sign in or create your DevSpace AI intern account.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <a
        href="#auth-card"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to sign in
      </a>
      <div className="grid min-h-screen lg:grid-cols-[58fr_42fr]">
        <div className="relative hidden overflow-hidden border-r border-border lg:block">
          <div className="relative h-full">
            <BrandPanel />
          </div>
        </div>
        <main className="flex items-center justify-center bg-background px-6 py-10">
          <div className="w-full max-w-md">
            <p className="mb-6 lg:hidden">
              <Link href="/" className="flex items-center gap-2" aria-label="DevSpace AI home">
                <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
                  D
                </span>
                <span className="text-[15px] font-bold tracking-tight text-foreground">DevSpace AI</span>
              </Link>
            </p>
            <div id="auth-card">
              <AuthCard />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
