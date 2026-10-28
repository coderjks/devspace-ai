"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

type Me = { id: string; email: string; full_name: string };
type Enrollment = { id: string; track: string; status: string };

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api<Me>("/api/auth/me"), api<Enrollment[]>("/api/enrollments/me")])
      .then(([meData, enrollmentData]) => {
        setMe(meData);
        setEnrollments(enrollmentData);
        setFullName(meData.full_name ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"));
  }, []);

  async function save() {
    setFieldError(null);
    setSaved(false);
    setError(null);
    const name = fullName.trim();
    if (!name) {
      setFieldError("Please enter your full name.");
      return;
    }
    setSaving(true);
    try {
      const updated = await api<Me>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: name }),
      });
      setMe(updated);
      setFullName(updated.full_name ?? name);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (error && !me) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Profile unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link href="/login">Go to sign in</Link></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const loading = !me || enrollments === null;

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Account</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Profile</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your identity across the internship. Your name appears to your teammates.
      </p>
      {loading ? <LoadingStatus label="Loading profile…" /> : null}

      <div className="mt-6 grid max-w-3xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
            <CardDescription>Managed by the platform — read-only.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium">{me?.email}</dd>
                </div>
                {(enrollments ?? []).map((e) => (
                  <div key={e.id} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Enrollment</dt>
                    <dd className="text-right font-medium">
                      {e.track} · {e.status}
                    </dd>
                  </div>
                ))}
                {enrollments?.length === 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Enrollment</dt>
                    <dd className="font-medium">
                      Not enrolled — <Link href="/onboarding" className="underline">start onboarding</Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Display name</CardTitle>
            <CardDescription>Shown on your dashboard and activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-32" />
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label htmlFor="full-name" className="text-sm font-medium">Full name</label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setFieldError(null);
                      setSaved(false);
                    }}
                    placeholder="Asha Sharma"
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={fieldError ? "full-name-error" : undefined}
                  />
                  {fieldError ? (
                    <p id="full-name-error" role="alert" className="text-sm text-destructive">{fieldError}</p>
                  ) : null}
                </div>
                {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
                {saved ? <p role="status" className="animate-fade-in text-sm text-success">Saved.</p> : null}
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
