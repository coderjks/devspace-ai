"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";

export function AuthCard() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  return (
    <div className="w-full rounded-xl border border-border bg-card p-6 text-card-foreground md:p-8">
      <div role="tablist" aria-label="Authentication mode" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "signin" ? "Sign In" : "Sign Up"}
          </button>
        ))}
      </div>
      <div className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Join DevSpace AI"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to your DevSpace AI account"
            : "Create your intern account to join the team"}
        </p>
      </div>
      <div role="tabpanel" className="mt-6">
        {mode === "signin" ? <SignInForm /> : <SignUpForm />}
      </div>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {mode === "signin" ? (
          <>Don&apos;t have an account? <button onClick={() => setMode("signup")} className="font-medium text-primary hover:underline">Sign up</button></>
        ) : (
          <>Already have an account? <button onClick={() => setMode("signin")} className="font-medium text-primary hover:underline">Sign in</button></>
        )}
      </p>
      <p className="mt-5 border-t border-border pt-4 text-center text-xs leading-5 text-muted-foreground">
        A simulated internship environment — not employment or accredited training.
      </p>
    </div>
  );
}
