import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-6 w-6 rounded-md text-[11px]",
  md: "h-8 w-8 rounded-[10px] text-sm",
  lg: "h-10 w-10 rounded-xl text-base",
} as const;

/**
 * DevSpace AI mark: a terminal prompt (chevron + caret) on a solid
 * primary tile. Token-based so light/dark themes stay calm, crisp at 24px.
 */
export function Logo({ size = "md", className }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-sm",
        SIZES[size],
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[62%] w-[62%]"
      >
        <path d="m8 8 4 4-4 4" />
        <line x1="13.5" y1="16" x2="17.5" y2="16" />
      </svg>
    </span>
  );
}
