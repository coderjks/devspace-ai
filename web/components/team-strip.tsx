"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TeammateAvatar } from "@/components/ui/teammate-avatar";
import { api } from "@/lib/api";

type Member = { id: string; name: string; role: string };

/**
 * One-row "who can I talk to" strip for the dashboard. Avatars deep-link
 * into team chat with that teammate preselected; full directory stays on
 * the Team page. Rendered nothing until the team loads.
 */
export function TeamStrip() {
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    api<{ members: Member[] }>("/api/team")
      .then((team) => setMembers(team.members))
      .catch(() => setMembers([]));
  }, []);

  if (members === null) {
    return <Skeleton className="h-24 w-full rounded-xl" aria-label="Loading team…" />;
  }
  if (members.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Ask your AI team</p>
          <Link
            href="/team"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Team chat <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
        <ul aria-label="AI teammates" className="mt-3 flex flex-wrap items-center gap-2.5">
          {members.map((m) => (
            <li key={m.id}>
              <Link
                href={`/team/${m.id}`}
                title={`${m.name} — ${m.role}`}
                aria-label={`Chat with ${m.name}, ${m.role}`}
                className="relative block rounded-full transition-transform duration-150 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <TeammateAvatar name={m.name} seed={m.id} size="md" animate={false} />
                <span
                  aria-hidden
                  title="active"
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500"
                />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
