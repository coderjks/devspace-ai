"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { CertificateQR } from "@/components/certificate-qr";
import { humanize } from "@/lib/utils";
import { api } from "@/lib/api";

type Skill = { skill: string; score: number; evidence_count: number };
type Certificate = {
  id: string;
  track: string;
  recipient_name: string;
  skills: Skill[];
  issued_at: string;
  credential: string;
};
type MeState = {
  certificate: Certificate | null;
  eligible: boolean;
  approved: number;
  total: number;
  remaining: string[];
};

function verifyUrl(credential: string): string {
  return `${window.location.origin}/verify/${credential}`;
}

/** Completion certificate: progress while working, QR + printable sheet once issued. */
export function CertificateCard() {
  const [state, setState] = useState<MeState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    api<MeState>("/api/certificates/me")
      .then(setState)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load certificate status"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function issue() {
    setIssuing(true);
    setError(null);
    try {
      await api("/api/certificates/issue", { method: "POST" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not issue the certificate yet.");
    } finally {
      setIssuing(false);
    }
  }

  async function copyLink(credential: string) {
    try {
      await navigator.clipboard.writeText(verifyUrl(credential));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — the verify link is on your certificate page.");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award size={16} aria-hidden /> Completion certificate
        </CardTitle>
        <CardDescription>
          Issued when every sprint ticket is approved. Verifiable by anyone via QR code — no sign-in needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? <p role="alert" className="mb-3 text-sm text-destructive">{error}</p> : null}
        {state === null ? (
          <div className="space-y-2">
            <LoadingStatus label="Checking certificate status…" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : state.certificate ? (
          <div className="flex flex-wrap items-center gap-4">
            <CertificateQR value={verifyUrl(state.certificate.credential)} size={120} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <CheckCircle2 size={15} aria-hidden className="text-emerald-500" />
                Issued {new Date(state.certificate.issued_at).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p className="text-sm text-muted-foreground">
                {humanize(state.certificate.track)} · {state.certificate.recipient_name} ·{" "}
                {state.certificate.skills.length} skills on record
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" asChild className="h-7 text-xs">
                  <Link href="/certificate">
                    View certificate <ArrowRight size={13} aria-hidden />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => void copyLink(state.certificate!.credential)}
                >
                  {copied ? <CheckCircle2 size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                  {copied ? "Copied" : "Copy verify link"}
                </Button>
              </div>
            </div>
          </div>
        ) : state.eligible ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">All {state.total} tickets approved — you&apos;ve earned it.</p>
            <Button size="sm" onClick={() => void issue()} disabled={issuing} aria-busy={issuing}>
              {issuing ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Award size={15} aria-hidden />}
              {issuing ? "Issuing…" : "Issue my certificate"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div
              className="flex h-2 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={state.total > 0 ? Math.round((state.approved / state.total) * 100) : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${state.approved} of ${state.total} tickets approved`}
            >
              <div
                className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
                style={{ width: state.total > 0 ? `${(state.approved / state.total) * 100}%` : "0%" }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {state.approved} of {state.total} tickets approved
              {state.remaining.length > 0 ? ` — still open: ${state.remaining.join(", ")}` : ""}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
