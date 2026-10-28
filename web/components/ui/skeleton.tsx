import { cn } from "@/lib/utils";

/** Shimmering placeholder block for loading states. Decorative — hide from AT. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton-shimmer rounded-md", className)} />;
}

/** Screen-reader status for async regions while skeletons show. */
export function LoadingStatus({ label }: { label: string }) {
  return (
    <p role="status" className="sr-only">
      {label}
    </p>
  );
}
