"use client";

import { Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function EmailField({
  id = "email",
  value,
  onChange,
  error,
  placeholder = "you@university.edu",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Email
      </label>
      <div className="relative">
        <Mail size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="email"
          placeholder={placeholder}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn("bg-background pl-9", error && "border-destructive")}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
