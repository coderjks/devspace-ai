"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { TeamChat } from "@/components/team-chat";
import { api } from "@/lib/api";

type Me = { email: string; full_name: string | null };

function displayName(me: Me | null): string {
  const first = me?.full_name?.trim().split(/\s+/)[0];
  if (first) return first;
  if (me?.email) return me.email.split("@")[0];
  return "You";
}

const KNOWN = new Set([
  "engineering-manager",
  "tech-lead",
  "senior-engineer",
  "qa-engineer",
  "scrum-master",
  "learning-assistant",
]);

export default function ChatPage({ params }: { params: { persona: string } }) {
  const { persona } = params;
  const known = KNOWN.has(persona);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api<Me>("/api/auth/me").then(setMe).catch(() => {});
  }, []);

  return (
    <AppShell email={me?.email}>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/team"><ArrowLeft size={15} aria-hidden /> Back to team</Link>
      </Button>
      {!known ? (
        <p role="alert" className="mt-4 text-sm text-destructive">Unknown teammate.</p>
      ) : (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Direct messages</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Team chat</h1>
          <TeamChat initialPersona={persona} youName={displayName(me)} />
        </>
      )}
    </AppShell>
  );
}
