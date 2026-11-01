"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

type Member = { id: string; name: string; role: string; responsibilities: string; kind: string };
type Me = { email: string };

export default function TeamPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Me>("/api/auth/me"), api<{ members: Member[] }>("/api/team")])
      .then(([meData, team]) => {
        setMe(meData);
        setMembers(team.members);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load team"));
  }, []);

  return (
    <AppShell email={me?.email}>
        <h1 className="text-2xl font-bold tracking-tight">Your virtual team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Five AI teammates plus a separate Learning Assistant. Chat with any of them about your work.
        </p>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {members.map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle>{m.name} — {m.role}</CardTitle>
                <CardDescription>{m.kind === "assistant" ? "Learning support" : "Teammate"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{m.responsibilities}</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/team/${m.id}`}>Chat <ArrowRight size={14} aria-hidden /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
    </AppShell>
  );
}
