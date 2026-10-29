import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Deterministic animated teammate avatar built on the shadcn Avatar.
 * The SVG bot character lives in AvatarFallback (no photo URLs in this app),
 * so sizing, shape, and overflow follow the shadcn scale: sm = size-8,
 * md = size-9. Faces are stable per `seed`; the idle bob is disabled under
 * prefers-reduced-motion by the global guard.
 */
const SIZES = {
  sm: "size-8",
  md: "size-9",
} as const;

export function TeammateAvatar({
  name,
  seed,
  size = "sm",
  animate = true,
  delay = 0,
  className,
}: {
  name: string;
  seed: string;
  size?: keyof typeof SIZES;
  animate?: boolean;
  delay?: number;
  className?: string;
}) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const variant = h % 4;

  return (
    <span
      className={cn("shrink-0", animate && "animate-avatar-bob")}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
    >
      <Avatar className={cn(SIZES[size], className)} aria-label={`${name} avatar`} role="img">
        <AvatarFallback className="bg-transparent p-0.5">
          <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
            <rect x="6" y="10" width="36" height="30" rx="10" fill={`hsl(${h} 55% 88%)`} />
            <rect x="6" y="10" width="36" height="30" rx="10" fill="none" stroke={`hsl(${h} 50% 45%)`} strokeWidth="2.5" />
            {variant !== 2 ? (
              <line x1="24" y1="10" x2="24" y2="3" stroke={`hsl(${h} 50% 45%)`} strokeWidth="2.5" strokeLinecap="round" />
            ) : null}
            {variant === 0 ? <circle cx="24" cy="3.5" r="2.5" fill={`hsl(${h} 70% 55%)`} /> : null}
            {variant === 1 ? (
              <>
                <line x1="12" y1="12" x2="7" y2="5" stroke={`hsl(${h} 50% 45%)`} strokeWidth="2.5" strokeLinecap="round" />
                <line x1="36" y1="12" x2="41" y2="5" stroke={`hsl(${h} 50% 45%)`} strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="7" cy="5" r="2.2" fill={`hsl(${(h + 40) % 360} 70% 55%)`} />
                <circle cx="41" cy="5" r="2.2" fill={`hsl(${(h + 40) % 360} 70% 55%)`} />
              </>
            ) : null}
            {variant === 3 ? (
              <rect x="14" y="4" width="20" height="6" rx="3" fill={`hsl(${(h + 40) % 360} 60% 60%)`} />
            ) : null}
            {variant === 2 ? (
              <rect x="12" y="20" width="24" height="10" rx="5" fill={`hsl(${h} 45% 30%)`} />
            ) : (
              <>
                <circle cx="17" cy="24" r="3.4" fill={`hsl(${h} 45% 30%)`} />
                <circle cx="31" cy="24" r="3.4" fill={`hsl(${h} 45% 30%)`} />
                <circle cx="18" cy="23" r="1.1" fill="#fff" />
                <circle cx="32" cy="23" r="1.1" fill="#fff" />
              </>
            )}
            {variant === 2 ? (
              <rect x="19" y="22.5" width="10" height="5" rx="2.5" fill={`hsl(${h} 80% 60%)`} />
            ) : (
              <path d="M19 32 Q24 36 29 32" stroke={`hsl(${h} 45% 30%)`} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            )}
          </svg>
        </AvatarFallback>
      </Avatar>
    </span>
  );
}
