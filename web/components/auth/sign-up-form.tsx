"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE, cn } from "@/lib/utils";
import { EmailField } from "./email-field";
import { PasswordField } from "./password-field";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || done) return;
    setFormError(null);
    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "Enter your full name.";
    if (!EMAIL_RE.test(email.trim())) errors.email = "Enter a valid email address.";
    if (password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (confirm !== password) errors.confirm = "Passwords do not match.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password, full_name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) throw new Error("An account with this email already exists. Try signing in.");
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Sign up failed. Try again.");
      if (data.access_token) localStorage.setItem("devspace_token", data.access_token);
      setDone(true);
      router.push("/onboarding");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="signup-name" className="text-sm font-medium text-foreground">
          Full name
        </label>
        <div className="relative">
          <User size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Asha Sharma"
            required
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "signup-name-error" : undefined}
            className={cn("bg-background pl-9", fieldErrors.name && "border-destructive")}
          />
        </div>
        {fieldErrors.name ? (
          <p id="signup-name-error" role="alert" className="text-xs text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>
      <EmailField id="signup-email" value={email} onChange={setEmail} error={fieldErrors.email} />
      <PasswordField
        id="signup-password"
        label="Password"
        value={password}
        onChange={setPassword}
        error={fieldErrors.password}
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />
      <PasswordField
        id="signup-confirm"
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        error={fieldErrors.confirm}
        autoComplete="new-password"
        placeholder="Repeat your password"
      />
      {formError ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {done ? (
        <p role="status" className="text-sm text-success">
          Account created — taking you to onboarding…
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading || done}>
        {loading ? "Creating account…" : (<>Sign Up <ArrowRight size={16} aria-hidden /></>)}
      </Button>
    </form>
  );
}
