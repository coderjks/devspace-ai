import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Gauge,
  GitPullRequest,
  HelpCircle,
  Home,
  KanbanSquare,
  ListTodo,
  Mic,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: Home, label: "Home", active: true },
  { icon: KanbanSquare, label: "Sprint" },
  { icon: ListTodo, label: "Tasks" },
  { icon: Users, label: "AI Team" },
  { icon: GitPullRequest, label: "Pull Requests" },
  { icon: BookOpen, label: "Learning" },
  { icon: Mic, label: "Standups" },
  { icon: Gauge, label: "Progress" },
];

const STATS = [
  { value: "6", label: "Total Tasks", tint: "text-info" },
  { value: "3", label: "In Progress", tint: "text-primary" },
  { value: "2", label: "In Review", tint: "text-warning" },
  { value: "1", label: "Completed", tint: "text-success" },
];

const ACTIVITY = [
  { icon: CheckCircle2, text: "Maya reviewed your PR", time: "2 hours ago" },
  { icon: GitPullRequest, text: "Task moved to In Review", time: "4 hours ago" },
  { icon: Mic, text: "Daily standup completed", time: "6 hours ago" },
];

const TEAM = [
  { initial: "P", name: "Priya", role: "Engineering Manager" },
  { initial: "A", name: "Arjun", role: "Tech Lead" },
  { initial: "M", name: "Maya", role: "Senior Engineer" },
  { initial: "R", name: "Rohit", role: "QA Engineer" },
  { initial: "S", name: "Sarah", role: "Scrum Master" },
  { initial: "A", name: "Ava", role: "Learning Assistant" },
];

export function WorkspacePreview() {
  return (
    <div
      role="img"
      aria-label="Illustrative preview of the DevSpace AI dashboard with sample data"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-lift ring-1 ring-foreground/5"
    >
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
      </div>
      <div className="grid md:grid-cols-[150px_1fr]">
        <div className="hidden border-r border-border bg-muted/40 p-3 md:block" aria-hidden>
          <p className="flex items-center gap-1.5 px-2 text-xs font-bold text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] text-primary-foreground">D</span>
            DevSpace AI
          </p>
          <ul className="mt-3 space-y-0.5">
            {NAV.map((n) => (
              <li
                key={n.label}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]",
                  n.active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <n.icon size={13} /> {n.label}
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-0.5 border-t border-border pt-3">
            {[
              { icon: Settings, label: "Settings" },
              { icon: HelpCircle, label: "Help" },
            ].map((n) => (
              <li key={n.label} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground">
                <n.icon size={13} /> {n.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 p-4">
          <div className="flex items-center gap-3">
            <p className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">
              <Search size={12} /> Search tasks, teammates, or ask anything…
            </p>
            <Bell size={14} className="shrink-0 text-muted-foreground" aria-hidden />
            <p className="hidden shrink-0 items-center gap-1.5 text-[11px] text-foreground sm:flex">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                AC
              </span>
              Alex Chen <ChevronDown size={12} className="text-muted-foreground" />
            </p>
          </div>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-foreground">Welcome back, Alex!</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Here&apos;s what&apos;s happening with your engineering team.</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-[11px] text-muted-foreground">Week 3 of 12</p>
              <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full w-1/4 rounded-full bg-primary" />
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">25%</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-md border border-border bg-background p-2 text-center">
                <p className={cn("text-base font-bold", s.tint)}>{s.value}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 grid gap-2 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-foreground">Current Sprint</p>
                <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">View Sprint →</span>
              </div>
              <p className="mt-1.5 text-xs font-medium text-foreground">Sprint 1: Build the Foundation</p>
              <p className="text-[10px] text-muted-foreground">Jan 15 – Jan 29, 2024</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">4 of 6 tasks</p>
              <div className="mt-2 border-t border-border pt-2">
                <p className="text-[11px] font-semibold text-foreground">Recent Activity</p>
                <ul className="mt-1.5 space-y-1.5">
                  {ACTIVITY.map((a) => (
                    <li key={a.text} className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                        <a.icon size={11} className="shrink-0 text-primary" /> <span className="truncate">{a.text}</span>
                      </span>
                      <span className="shrink-0 text-muted-foreground">{a.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-foreground">Your AI Team</p>
                <p className="flex items-center gap-1 text-[10px] text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online
                </p>
              </div>
              <ul className="mt-2 space-y-2">
                {TEAM.map((m) => (
                  <li key={m.name} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                      {m.initial}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-medium text-foreground">{m.name}</span>
                      <span className="block truncate text-[9px] text-muted-foreground">{m.role}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
