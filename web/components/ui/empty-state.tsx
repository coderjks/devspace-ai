import type { LucideIcon } from "lucide-react";

/** Compact empty state: icon tile, title, and one line of guidance. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center px-2 py-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon size={18} aria-hidden />
      </span>
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {hint ? <p className="mt-1 max-w-[16rem] text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
