"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type Question = { id: string; prompt: string; choices: string[] };
type Score = { score: number; total: number };

const EXPERIENCE = ["student", "fresher", "junior", "mid", "senior"];
const SKILLS = ["beginner", "intermediate", "advanced"];

const STORAGE_KEY = "devspace_onboarding";

type SavedWizard = {
  step: unknown;
  fullName: unknown;
  experience: unknown;
  skill: unknown;
  goals: unknown;
  answers: unknown;
  diagnosticDone: unknown;
  score: unknown;
};

function isScore(value: unknown): value is Score {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.score === "number" && typeof v.total === "number";
}

function isAnswers(value: unknown): value is Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((v) => typeof v === "number");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [experience, setExperience] = useState("student");
  const [skill, setSkill] = useState("beginner");
  const [goals, setGoals] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState<Score | null>(null);
  const [diagnosticDone, setDiagnosticDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);

  useEffect(() => {
    let restoredStep = 1;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SavedWizard>;
        if (typeof saved.step === "number" && saved.step >= 1 && saved.step <= 4) {
          setStep(saved.step);
          restoredStep = saved.step;
        }
        if (typeof saved.fullName === "string") setFullName(saved.fullName);
        if (typeof saved.experience === "string" && EXPERIENCE.includes(saved.experience)) {
          setExperience(saved.experience);
        }
        if (typeof saved.skill === "string" && SKILLS.includes(saved.skill)) {
          setSkill(saved.skill);
        }
        if (typeof saved.goals === "string") setGoals(saved.goals);
        if (isAnswers(saved.answers)) setAnswers(saved.answers);
        if (typeof saved.diagnosticDone === "boolean") setDiagnosticDone(saved.diagnosticDone);
        if (saved.score === null || isScore(saved.score)) setScore(saved.score);
      }
    } catch {
      // Corrupt or unavailable storage: start fresh.
    }
    setHydrated(true);

    (async () => {
      try {
        const me = await api<{ full_name: string; email: string }>("/api/auth/me");
        setFullName((prev) => prev || (me.full_name ?? ""));
      } catch {
        router.push("/login");
        return;
      }
      try {
        const enrollments = await api<unknown[]>("/api/enrollments/me");
        if (Array.isArray(enrollments) && enrollments.length > 0) {
          setAlreadyEnrolled(true);
          router.push("/dashboard");
          return;
        }
      } catch {
        // Not enrolled or check unavailable: stay on the wizard.
      }
      if (restoredStep >= 2) {
        try {
          const qs = await api<Question[]>("/api/diagnostics/questions");
          setQuestions(qs);
        } catch {
          // Leave questions empty; the user can go back to step 1 to retry.
        }
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!hydrated || alreadyEnrolled) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, fullName, experience, skill, goals, answers, diagnosticDone, score }),
      );
    } catch {
      // Storage unavailable: wizard still works for this session.
    }
  }, [hydrated, alreadyEnrolled, step, fullName, experience, skill, goals, answers, diagnosticDone, score]);

  async function loadQuestions(): Promise<boolean> {
    try {
      const qs = await api<Question[]>("/api/diagnostics/questions");
      setQuestions(qs);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load diagnostic");
      return false;
    }
  }

  async function saveProfile() {
    setError(null);
    setLoading(true);
    try {
      const name = fullName.trim();
      if (!name) throw new Error("Please enter your name");
      await api("/api/users/me", { method: "PATCH", body: JSON.stringify({ full_name: name }) });
      const ok = await loadQuestions();
      if (!ok) return;
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setLoading(false);
    }
  }

  async function submitDiagnostic() {
    setError(null);
    setLoading(true);
    try {
      const result = await api<{ score: number; total: number }>("/api/diagnostics/attempts", {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setScore(result);
      setDiagnosticDone(true);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit diagnostic");
    } finally {
      setLoading(false);
    }
  }

  async function enroll() {
    setError(null);
    setLoading(true);
    try {
      await api("/api/enrollments", {
        method: "POST",
        body: JSON.stringify({
          track: "applied-ai-engineering",
          skill_level: skill,
          experience_level: experience,
          goals: goals.trim() || null,
        }),
      });
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage unavailable: enrollment already succeeded.
      }
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enroll");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function skipDiagnostic() {
    setError(null);
    setStep(3);
  }

  function continueToReview() {
    setError(null);
    setStep(4);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-10">
      <p className="text-sm text-muted-foreground">Step {step} of 4 — Join the Applied AI Engineering team</p>
      {alreadyEnrolled ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Already enrolled — taking you to your dashboard…
        </p>
      ) : null}

      {step === 1 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>Stored on your account. Nothing here is shared beyond the internship.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">Full name</label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Asha Sharma" />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" onClick={saveProfile} disabled={loading}>
              {loading ? "Saving…" : "Continue"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Optional diagnostic</CardTitle>
            <CardDescription>Four quick Python and Git questions. Skipping is fine — it only calibrates hints.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {questions.map((q, i) => (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium">{i + 1}. {q.prompt}</p>
                <div className="space-y-1">
                  {q.choices.map((c, ci) => (
                    <label key={ci} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === ci}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goBack}>Back</Button>
              <Button variant="outline" className="flex-1" onClick={skipDiagnostic}>Skip</Button>
              <Button className="flex-1" onClick={submitDiagnostic} disabled={loading || questions.length === 0}>
                {loading ? "Submitting…" : "Submit answers"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>Tell us about your background so your teammates can calibrate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="exp" className="text-sm font-medium">Experience</label>
              <select id="exp" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={experience} onChange={(e) => setExperience(e.target.value)}>
                {EXPERIENCE.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="skill" className="text-sm font-medium">Current skill level</label>
              <select id="skill" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={skill} onChange={(e) => setSkill(e.target.value)}>
                {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="goals" className="text-sm font-medium">Goals for the internship</label>
              <Input id="goals" value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="Ship the support backend and learn RAG" />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goBack}>Back</Button>
              <Button className="flex-1" onClick={continueToReview}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Review and confirm</CardTitle>
            <CardDescription>One track is available in the hackathon.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Full name</dt>
                <dd className="font-medium">{fullName.trim() || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Experience</dt>
                <dd className="font-medium">{experience}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Skill level</dt>
                <dd className="font-medium">{skill}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Goals</dt>
                <dd className="text-right font-medium">{goals.trim() || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Diagnostic</dt>
                <dd className="font-medium">
                  {diagnosticDone && score ? `${score.score}/${score.total}` : "Skipped"}
                </dd>
              </div>
            </dl>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goBack}>Back</Button>
              <Button className="flex-1" onClick={enroll} disabled={loading}>
                {loading ? "Enrolling…" : "Confirm and join"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
