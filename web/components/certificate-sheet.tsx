"use client";

import { CertificateQR } from "@/components/certificate-qr";
import { humanize } from "@/lib/utils";

export type SheetSkill = { skill: string; score: number; evidence_count: number };
export type SheetProgram = { sprint: string; tickets_approved: number; tickets_total: number };

const SERIF = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;

/**
 * Formal internship completion certificate, designed to be submitted as
 * proof: program, sprint, ticket count, skills, issue date, certificate ID,
 * verification instructions, QR, seal, and signatory block.
 */
export function CertificateSheet({
  recipientName,
  track,
  issuedAt,
  skills,
  verifyUrl,
  credentialCode,
  program,
}: {
  recipientName: string;
  track: string;
  issuedAt: string;
  skills: SheetSkill[];
  verifyUrl: string;
  credentialCode?: string | null;
  program?: SheetProgram | null;
}) {
  const date = new Date(issuedAt).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const details: Array<[string, string]> = [["Program", `${humanize(track)} Internship`]];
  details.push(["Date of issue", date]);
  return (
    <div className="rounded-sm border border-[#c9b98a] bg-[#fdfbf5] p-2 shadow-sm dark:bg-[#1d2530] dark:shadow-none print:bg-white print:shadow-none">
      <div className="border-2 border-[#1e3a5f] px-6 py-10 sm:px-12 dark:border-[#8fa8c4] print:border-[#1e3a5f]">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.32em] text-[#8a6d2b] dark:text-[#d3b968] print:text-[#8a6d2b]">
          DevSpace AI · {humanize(track)} Internship
        </p>
        <h1
          className="mt-4 text-center text-4xl font-normal tracking-tight text-[#16283f] sm:text-5xl dark:text-[#e9eef6] print:text-[#16283f]"
          style={SERIF}
        >
          Certificate of Completion
        </h1>
        <div className="mx-auto mt-5 flex max-w-xs items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-[#c9b98a]" />
          <span className="h-1.5 w-1.5 rotate-45 bg-[#8a6d2b] dark:bg-[#d3b968] print:bg-[#8a6d2b]" />
          <span className="h-px flex-1 bg-[#c9b98a]" />
        </div>
        <p className="mt-6 text-center text-xs uppercase tracking-[0.24em] text-muted-foreground">
          This certificate is proudly presented to
        </p>
        <p
          className="mx-auto mt-2 max-w-2xl text-center text-4xl text-[#16283f] sm:text-5xl dark:text-[#e9eef6] print:text-[#16283f]"
          style={{ ...SERIF, fontStyle: "italic" }}
        >
          {recipientName}
        </p>
        <p className="mx-auto mt-5 max-w-xl text-center text-sm leading-6 text-muted-foreground">
          for successfully completing the {humanize(track)} internship.
        </p>

        <dl className="mx-auto mt-8 max-w-xl divide-y divide-[#e3d9bd] border-y border-[#e3d9bd] text-left dark:divide-[#3a4453] dark:border-[#3a4453] print:divide-[#e3d9bd] print:border-[#e3d9bd]">
          {details.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[140px_1fr] gap-3 px-1 py-2 sm:grid-cols-[180px_1fr]">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {label}
              </dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          ))}
          {skills.length > 0 ? (
            <div className="grid grid-cols-[140px_1fr] gap-3 px-1 py-2 sm:grid-cols-[180px_1fr]">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Skills evidenced
              </dt>
              <dd className="text-sm">{skills.map((s) => humanize(s.skill)).join(" · ")}</dd>
            </div>
          ) : null}
          {credentialCode ? (
            <div className="grid grid-cols-[140px_1fr] gap-3 px-1 py-2 sm:grid-cols-[180px_1fr]">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Certificate ID
              </dt>
              <dd className="break-all font-mono text-xs">{credentialCode.split(".")[0]}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mx-auto mt-8 flex max-w-xl flex-col items-center justify-between gap-8 sm:flex-row sm:gap-4">
          <div className="text-center">
            <span className="inline-block rounded-md bg-white p-1.5">
              <CertificateQR value={verifyUrl} size={104} />
            </span>
            <p className="mt-2 max-w-[180px] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Scan to verify
            </p>
          </div>
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-[#8a6d2b] text-center dark:border-[#d3b968] print:border-[#8a6d2b]"
            aria-hidden
          >
            <span className="px-2 text-[9px] font-bold uppercase leading-tight tracking-[0.18em] text-[#8a6d2b] dark:text-[#d3b968] print:text-[#8a6d2b]">
              DevSpace Verified
            </span>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xl text-[#16283f] dark:text-[#e9eef6] print:text-[#16283f]" style={{ ...SERIF, fontStyle: "italic" }}>
              DevSpace AI
            </p>
            <p className="mx-auto mt-1 w-40 border-t border-[#8a6d2b] pt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:ml-auto sm:mr-0">
              Authorized signatory
            </p>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-xl text-center text-[11px] leading-5 text-muted-foreground">
          Colleges and employers can confirm this certificate by scanning the code.
        </p>
      </div>
    </div>
  );
}
