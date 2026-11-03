"use client";

import { useEffect, useState } from "react";
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

export default function TeamPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api<Me>("/api/auth/me").then(setMe).catch(() => {});
  }, []);

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Direct messages</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Team chat</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Chat with your AI engineering team — pick someone on the left to start talking.
      </p>
      <TeamChat youName={displayName(me)} />
    </AppShell>
  );
}
