import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-6 w-6 rounded-md text-[11px]",
  md: "h-8 w-8 rounded-[10px] text-sm",
  lg: "h-10 w-10 rounded-xl text-base",
} as const;

/**
 * DevSpace AI mark: a code-bracket "D" — the D carries a terminal caret cut —
 * on an indigo→violet gradient tile with a gold pixel. Distinctive at 24px,
 * theme-safe (white on saturated gradient in both themes).
 */
export function Logo({ size = "md", className }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-primary via-[#6d5ef0] to-[#8b5cf6] font-black leading-none text-white shadow-sm",
        SIZES[size],
        className
      )}
    >
      <span className="translate-y-[-0.5px]">
        D<span className="text-amber-300">_</span>
      </span>
    </span>
  );
}
