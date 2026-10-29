import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-muted-foreground">DevSpace AI — Simulation</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Applied AI Engineering Internship</h1>
      <p className="mt-4 text-base leading-7 text-muted-foreground">
        A simulated workplace where you join a virtual engineering team, work a six-ticket sprint,
        collaborate with AI teammates, and ship real GitHub pull requests. This is a simulation,
        not employment or accredited training.
      </p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Phase 01 — Foundation ready</CardTitle>
          <CardDescription>Sign in with the seeded demo account to fetch the persisted sprint.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
      <p className="mt-6 text-xs text-muted-foreground">
        Demo: demo@devspace.ai / DemoPass123! (seeded, change in production)
      </p>
    </main>
  );
}
