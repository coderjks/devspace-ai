import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * Humanize a machine value for display: "applied-ai-engineering" →
 * "Applied AI Engineering", "in_progress" → "In Progress".
 * Acronyms of two letters stay uppercased (AI); anything else Title Cases.
 */
const ACRONYMS = new Set(["ai", "api", "pr", "ui", "ux"]);

export function humanize(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase();
      if (ACRONYMS.has(lower)) return w.toUpperCase();
      const singular = lower.endsWith("s") ? lower.slice(0, -1) : lower;
      if (ACRONYMS.has(singular)) return singular.toUpperCase() + w.slice(-1).toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}
