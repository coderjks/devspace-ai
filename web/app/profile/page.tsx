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
type Enrollment = { id: string; track: string; status: string; skill_level: string };

const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [skillLevel, setSkillLevel] = useState<string>("beginner");
  const [skillError, setSkillError] = useState<string | null>(null);
  const [skillSaved, setSkillSaved] = useState(false);
  const [skillSaving, setSkillSaving] = useState(false);

  useEffect(() => {
    Promise.all([api<Me>("/api/auth/me"), api<Enrollment[]>("/api/enrollments/me")])
      .then(([meData, enrollmentData]) => {
        setMe(meData);
        setEnrollments(enrollmentData);
        setFullName(meData.full_name ?? "");
        if (enrollmentData[0]?.skill_level) setSkillLevel(enrollmentData[0].skill_level);
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

  async function savePassword() {
    setPwError(null);
    setPwSaved(false);
    if (!currentPassword) {
      setPwError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      await api<Me>("/api/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSaved(true);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setPwSaving(false);
    }
  }

  async function saveSkill() {
    setSkillError(null);
    setSkillSaved(false);
    setSkillSaving(true);
    try {
      const updated = await api<Enrollment>("/api/enrollments/me", {
        method: "PATCH",
        body: JSON.stringify({ skill_level: skillLevel }),
      });
      setEnrollments((prev) => (prev ?? []).map((e) => (e.id === updated.id ? updated : e)));
      setSkillSaved(true);
    } catch (e) {
      setSkillError(e instanceof Error ? e.message : "Could not update skill level");
    } finally {
      setSkillSaving(false);
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
                      {e.track} · {e.status} · {e.skill_level}
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

        <Card>
          <CardHeader>
            <CardTitle>Skill level</CardTitle>
            <CardDescription>How tasks and hints are calibrated for you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : (enrollments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Enroll first — <Link href="/onboarding" className="underline">start onboarding</Link>.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <label htmlFor="skill-level" className="text-sm font-medium">Level</label>
                  <select
                    id="skill-level"
                    value={skillLevel}
                    onChange={(e) => {
                      setSkillLevel(e.target.value);
                      setSkillError(null);
                      setSkillSaved(false);
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {SKILL_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                {skillError ? <p role="alert" className="text-sm text-destructive">{skillError}</p> : null}
                {skillSaved ? <p role="status" className="animate-fade-in text-sm text-success">Saved.</p> : null}
                <Button onClick={saveSkill} disabled={skillSaving}>
                  {skillSaving ? "Saving…" : "Save level"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Use at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <>
                <div className="space-y-1">
                  <label htmlFor="current-password" className="text-sm font-medium">Current password</label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPwError(null);
                      setPwSaved(false);
                    }}
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="new-password" className="text-sm font-medium">New password</label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPwError(null);
                      setPwSaved(false);
                    }}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPwError(null);
                      setPwSaved(false);
                    }}
                    autoComplete="new-password"
                  />
                </div>
                {pwError ? <p role="alert" className="text-sm text-destructive">{pwError}</p> : null}
                {pwSaved ? <p role="status" className="animate-fade-in text-sm text-success">Password changed.</p> : null}
                <Button onClick={savePassword} disabled={pwSaving}>
                  {pwSaving ? "Saving…" : "Change password"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
