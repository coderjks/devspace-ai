"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { humanize } from "@/lib/utils";

type Me = { id: string; email: string; full_name: string };
type Enrollment = { id: string; track: string; status: string; skill_level: string };

const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [initial, setInitial] = useState({ name: "", skill: "beginner" });
  const [fullName, setFullName] = useState("");
  const [skillLevel, setSkillLevel] = useState<string>("beginner");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api<Me>("/api/auth/me"), api<Enrollment[]>("/api/enrollments/me")])
      .then(([meData, enrollmentData]) => {
        setMe(meData);
        setEnrollments(enrollmentData);
        const name = meData.full_name ?? "";
        const skill = enrollmentData[0]?.skill_level ?? "beginner";
        setFullName(name);
        setSkillLevel(skill);
        setInitial({ name, skill });
      })
      .catch(() => setNameError("Failed to load profile."));
  }, []);

  function touch() {
    setSaved(false);
  }

  const wantsPasswordChange = currentPassword !== "" || newPassword !== "" || confirmPassword !== "";
  const dirty =
    fullName.trim() !== initial.name.trim() || skillLevel !== initial.skill || wantsPasswordChange;

  async function saveAll(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setNameError(null);
    setPwError(null);
    setSkillError(null);
    setSaved(false);

    const name = fullName.trim();
    if (!name) {
      setNameError("Please enter your full name.");
      return;
    }
    if (wantsPasswordChange) {
      if (!currentPassword) {
        setPwError("Enter your current password to change it.");
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
    }

    setSaving(true);
    try {
      if (name !== initial.name.trim()) {
        const updated = await api<Me>("/api/users/me", {
          method: "PATCH",
          body: JSON.stringify({ full_name: name }),
        });
        setMe(updated);
        setFullName(updated.full_name ?? name);
      }
      if (skillLevel !== initial.skill && (enrollments ?? []).length > 0) {
        const updated = await api<Enrollment>("/api/enrollments/me", {
          method: "PATCH",
          body: JSON.stringify({ skill_level: skillLevel }),
        });
        setEnrollments((prev) => (prev ?? []).map((en) => (en.id === updated.id ? updated : en)));
      }
      if (wantsPasswordChange) {
        await api<Me>("/api/users/me/password", {
          method: "PATCH",
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
      setInitial({ name, skill: skillLevel });
      setSaved(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save changes.";
      // Attribute the failure to the most likely section.
      if (wantsPasswordChange && /password/i.test(message)) setPwError(message);
      else if (skillLevel !== initial.skill) setSkillError(message);
      else setNameError(message);
    } finally {
      setSaving(false);
    }
  }

  const loading = !me || enrollments === null;

  return (
    <AppShell email={me?.email}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Account</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Profile</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your identity across the internship. Your name appears to your teammates.
      </p>
      {loading ? <LoadingStatus label="Loading profile…" /> : null}

      <form onSubmit={saveAll} className="mt-6 grid max-w-3xl gap-4">
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
                {(enrollments ?? []).map((en) => (
                  <div key={en.id} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Enrollment</dt>
                    <dd className="text-right font-medium">
                      {humanize(en.track)} · {humanize(en.status)} · {humanize(en.skill_level)}
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
            <CardDescription>Shown on your dashboard, in chat, and on activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <div className="max-w-md space-y-1">
                <label htmlFor="full-name" className="text-sm font-medium">Full name</label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setNameError(null);
                    touch();
                  }}
                  placeholder="Asha Sharma"
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? "full-name-error" : undefined}
                />
                {nameError ? (
                  <p id="full-name-error" role="alert" className="text-sm text-destructive">{nameError}</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill level</CardTitle>
            <CardDescription>How tasks and hints are calibrated for you.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : (enrollments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Enroll first — <Link href="/onboarding" className="underline">start onboarding</Link>.
              </p>
            ) : (
              <div className="max-w-md space-y-1">
                <label htmlFor="skill-level" className="text-sm font-medium">Level</label>
                <select
                  id="skill-level"
                  value={skillLevel}
                  onChange={(e) => {
                    setSkillLevel(e.target.value);
                    setSkillError(null);
                    touch();
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {SKILL_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
                {skillError ? <p role="alert" className="text-sm text-destructive">{skillError}</p> : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Leave blank to keep your current password. New passwords need at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent className="grid max-w-md gap-4">
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
                      touch();
                    }}
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="new-password" className="text-sm font-medium">New password</label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPwError(null);
                        touch();
                      }}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new</label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPwError(null);
                        touch();
                      }}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                {pwError ? <p role="alert" className="text-sm text-destructive">{pwError}</p> : null}
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || loading || !dirty}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {saved ? <p role="status" className="animate-fade-in text-sm text-success">All changes saved.</p> : null}
          {!dirty && !saved ? (
            <p className="text-sm text-muted-foreground">No unsaved changes.</p>
          ) : null}
        </div>
      </form>
    </AppShell>
  );
}
