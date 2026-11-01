"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { CertificateSheet } from "@/components/certificate-sheet";
import { api } from "@/lib/api";

type Certificate = {
  id: string;
  track: string;
  recipient_name: string;
  skills: { skill: string; score: number; evidence_count: number }[];
  program: { sprint: string; tickets_approved: number; tickets_total: number } | null;
  issued_at: string;
  credential: string;
};

export default function CertificatePage() {
  const [cert, setCert] = useState<Certificate | null>(null);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ certificate: Certificate | null; eligible: boolean }>("/api/certificates/me")
      .then((me) => {
        setCert(me.certificate);
        setEligible(me.eligible);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Sign in to view your certificate."));
  }, []);

  const verifyUrl =
    typeof window !== "undefined" && cert ? `${window.location.origin}/verify/${cert.credential}` : "";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/progression">
            <ArrowLeft size={15} aria-hidden /> Back to Growth
          </Link>
        </Button>
        {cert ? (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={15} aria-hidden /> Print / Save PDF
          </Button>
        ) : null}
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {cert ? (
        <CertificateSheet
          recipientName={cert.recipient_name}
          track={cert.track}
          issuedAt={cert.issued_at}
          skills={cert.skills}
          verifyUrl={verifyUrl}
          credentialCode={cert.credential}
          program={cert.program}
        />
      ) : error || eligible === null ? (
        !error ? (
          <div className="space-y-3">
            <LoadingStatus label="Loading certificate…" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : null
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-lg font-bold">No certificate yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {eligible
              ? "You're eligible — issue it from the certificate card on the Growth page."
              : "Approve every sprint ticket to earn your completion certificate."}
          </p>
          <Button size="sm" asChild className="mt-4">
            <Link href="/progression">Go to Growth</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
