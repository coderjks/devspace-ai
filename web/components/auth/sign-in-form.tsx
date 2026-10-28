"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/utils";
import { EmailField } from "./email-field";
import { PasswordField } from "./password-field";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || done) return;
    setFormError(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");
    if (!password) {
      setFormError("Enter your password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: trimmed, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Sign in failed. Check your email and password.");
      }
      if (data.access_token) localStorage.setItem("devspace_token", data.access_token);
      setDone(true);
      router.push("/dashboard");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <EmailField value={email} onChange={(v) => { setEmail(v); setEmailError(""); }} error={emailError} />
      <PasswordField
        id="signin-password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {formError ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {done ? (
        <p role="status" className="text-sm text-success">
          Signed in — redirecting to your dashboard…
        </p>
      ) : null}
      <Button type="submit" className="group/btn w-full" disabled={loading || done} aria-busy={loading}>
        {loading ? (
          <><Loader2 size={16} aria-hidden className="animate-spin" /> Signing in…</>
        ) : (
          <>Sign In <ArrowRight size={16} aria-hidden className="group-hover/btn:translate-x-0.5" /></>
        )}
      </Button>
    </form>
  );
}
