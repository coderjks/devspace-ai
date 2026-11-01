"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TeamChat } from "@/components/team-chat";
import { api } from "@/lib/api";

type Me = { email: string };

export default function TeamPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api<Me>("/api/auth/me").then(setMe).catch(() => {});
  }, []);

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Direct messages</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Team chat</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        Five AI teammates plus a separate Learning Assistant. Pick a teammate on the left — their chat loads on the right.
      </p>
      <TeamChat youName={me?.email ? me.email.split("@")[0] : "You"} />
    </AppShell>
  );
}
