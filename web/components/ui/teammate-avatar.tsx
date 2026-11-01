import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import * as personas from "@dicebear/personas";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Deterministic animated teammate avatar built on the shadcn Avatar.
 * Each persona gets a stable illustrated human character (DiceBear
 * "personas" style, generated locally from `seed` — no network, no photo
 * URLs), so sizing, shape, and overflow follow the shadcn scale: sm = size-8,
 * md = size-9. The idle bob is disabled under prefers-reduced-motion by the
 * global guard.
 *
 * Character artwork: "Personas" by Draftbit (personas.draftbit.com),
 * licensed CC BY 4.0 — embedded metadata in each generated SVG carries the
 * full attribution.
 */
const SIZES = {
  sm: "size-8",
  md: "size-9",
} as const;

// Soft theme-friendly portrait backdrops; DiceBear picks one per seed.
const BACKGROUNDS = ["e0e7ff", "dbeafe", "ede9fe", "fce7f3", "dcfce7", "fef3c7"];

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
  const svg = useMemo(
    () =>
      createAvatar(personas, {
        seed,
        backgroundColor: BACKGROUNDS,
      }).toString(),
    [seed]
  );

  return (
    <span
      className={cn("shrink-0", animate && "animate-avatar-bob")}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
    >
      <Avatar className={cn(SIZES[size], className)} aria-label={`${name} avatar`} role="img">
        <AvatarFallback
          className="overflow-hidden bg-muted p-0 [&>svg]:h-full [&>svg]:w-full"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </Avatar>
    </span>
  );
}
