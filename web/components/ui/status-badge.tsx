import { CheckCircle2, Circle, Clock3, Eye, Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  locked: {
    label: "Locked",
    icon: Lock,
    className: "bg-muted text-muted-foreground",
  },
  todo: {
    label: "To Do",
    icon: Circle,
    className: "bg-info/15 text-info",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock3,
    className: "bg-primary/15 text-primary",
  },
  in_review: {
    label: "In Review",
    icon: Eye,
    className: "bg-warning/15 text-warning",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-success/15 text-success",
  },
};

/** Status pill with icon + label. Never color alone: the icon and text always pair. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = TONES[status] ?? { label: status.replace(/_/g, " "), icon: Circle, className: "bg-muted text-muted-foreground" };
  const Icon = tone.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone.className,
        className
      )}
    >
      <Icon size={13} aria-hidden />
      {tone.label}
    </span>
  );
}
