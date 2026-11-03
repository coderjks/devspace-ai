"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { CertificateSheet } from "@/components/certificate-sheet";
import { API_BASE } from "@/lib/utils";

type VerifyState = {
  valid: boolean;
  recipient_name: string | null;
  track: string | null;
  issued_at: string | null;
  skills: { skill: string; score: number; evidence_count: number }[];
  program: { sprint: string; tickets_approved: number; tickets_total: number } | null;
};

/**
 * Public verification page: no sign-in, no sidebar. Anyone with the QR link
 * can confirm a certificate is genuine. Forged or mistyped codes fail closed
 * with a plain invalid verdict — the backend never distinguishes why.
 */
export default function VerifyPage({ params }: { params: { credential: string } }) {
  const { credential } = params;
  const [state, setState] = useState<VerifyState | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/certificates/verify/${credential}`)
      .then((res) => (res.ok ? res.json() : { valid: false }))
      .then(setState)
      .catch(() => setState({ valid: false, recipient_name: null, track: null, issued_at: null, skills: [], program: null }));
  }, [credential]);

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground"
          >
            D
          </span>
          DevSpace AI
        </p>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              Learn more <ArrowRight size={13} aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      {state === null ? (
        <div className="space-y-3">
          <LoadingStatus label="Verifying certificate…" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : state.valid && state.recipient_name && state.issued_at ? (
        <>
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} aria-hidden /> Verified genuine — issued by DevSpace AI
          </p>
          <CertificateSheet
            recipientName={state.recipient_name}
            track={state.track ?? "applied-ai-engineering"}
            issuedAt={state.issued_at}
            skills={state.skills}
            verifyUrl={pageUrl}
            program={state.program}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-destructive/40 bg-card p-8 text-center">
          <p className="inline-flex items-center gap-2 text-lg font-bold">
            <ShieldAlert size={20} aria-hidden className="text-destructive" /> Certificate not verified
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            This link doesn&apos;t match a genuine DevSpace AI certificate. Check the QR code or URL for typos —
            forged credentials are rejected here.
          </p>
        </div>
      )}
    </main>
  );
}
