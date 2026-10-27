"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type Question = { id: string; prompt: string; choices: string[] };

const EXPERIENCE = ["student", "fresher", "junior", "mid", "senior"];
const SKILLS = ["beginner", "intermediate", "advanced"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [experience, setExperience] = useState("student");
  const [skill, setSkill] = useState("beginner");
  const [goals, setGoals] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState<{ score: number; total: number } | null>(null);
  const [diagnosticDone, setDiagnosticDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ full_name: string; email: string }>("/api/auth/me")
      .then((me) => setFullName(me.full_name ?? ""))
      .catch(() => router.push("/login"));
  }, [router]);

  async function loadQuestions() {
    try {
      const qs = await api<Question[]>("/api/diagnostics/questions");
      setQuestions(qs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load diagnostic");
    }
  }

  async function saveProfile() {
    setError(null);
    setLoading(true);
    try {
      const name = fullName.trim();
      if (!name) throw new Error("Please enter your name");
      await api("/api/users/me", { method: "PATCH", body: JSON.stringify({ full_name: name }) });
      await loadQuestions();
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
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enroll");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-10">
      <p className="text-sm text-muted-foreground">Step {step} of 3 — Join the Applied AI Engineering team</p>

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
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
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
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Skip</Button>
              <Button className="flex-1" onClick={submitDiagnostic} disabled={loading}>
                {loading ? "Submitting…" : "Submit answers"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Enroll in Applied AI Engineering</CardTitle>
            <CardDescription>
              {diagnosticDone && score ? `Diagnostic scored ${score.score}/${score.total} and was saved. ` : null}
              One track is available in the hackathon.
            </CardDescription>
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
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" onClick={enroll} disabled={loading}>
              {loading ? "Enrolling…" : "Join the team"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
