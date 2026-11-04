"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PRODUCT_TOUR_EVENT = "devspace:start-product-tour";

type Rect = { top: number; left: number; width: number; height: number };

type TourStep = {
  id: string;
  title: string;
  body: string;
  route?: string;
  selector?: string;
  primaryLabel?: string;
};

const STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to your first engineering team",
    body: "DevSpace works like a real sprint: pick up a ticket, ask your teammates for help, share a daily standup, submit your work for review, and unlock the next ticket when it is approved. This short tour shows you where each part lives.",
    primaryLabel: "Start the tour",
  },
  {
    id: "next-step",
    title: "Start from your next step",
    body: "Your dashboard always points to the most useful thing to do next — your current ticket, today's standup, or your progress so far. When you are not sure where to begin, begin here.",
    route: "/dashboard",
    selector: '[data-tour="dashboard-next"]',
  },
  {
    id: "board",
    title: "Your sprint board",
    body: "The board holds your six sprint tickets. Open a ticket to read what to build, what “done” looks like, and what you need before you start. Tickets unlock in order as your work is approved.",
    route: "/board",
    selector: '[data-tour="nav-board"]',
  },
  {
    id: "standup",
    title: "Share a daily standup",
    body: "Use Standup to say what you finished, what you are doing next, and anything blocking you. You can type it or use your voice, then review it before sharing.",
    route: "/standup",
    selector: '[data-tour="nav-standup"]',
  },
  {
    id: "team",
    title: "Ask your team",
    body: "Your AI teammates each help with something different: planning, coding, testing, standups, and progress. Ask in plain words — and ask the Learning Assistant when you want a hint instead of an answer.",
    route: "/team",
    selector: '[data-tour="nav-team"]',
  },
  {
    id: "github",
    title: "Submit your work",
    body: "When a ticket is ready, connect your project copy and submit your pull request from the GitHub page. You will get clear feedback on what passed and what to fix.",
    route: "/github",
    selector: '[data-tour="nav-github"]',
  },
  {
    id: "growth",
    title: "Watch yourself grow",
    body: "Growth shows the skills you have demonstrated through approved work. It is based on your real submissions, so it grows as you complete tickets.",
    route: "/progression",
    selector: '[data-tour="nav-progression"]',
  },
  {
    id: "done",
    title: "You are ready to start",
    body: "A good first session: open the board, read AI-001, say hello to your Tech Lead, and share your first standup. You can replay this tour any time from the sidebar.",
    primaryLabel: "Finish",
  },
];

const ACTIVE_TOUR_KEY = "devspace_product_tour_active_v1";

function storageKey(email?: string): string {
  return `devspace_product_tour_v1:${(email ?? "current-user").toLowerCase()}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function ProductTour({ email }: { email?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });
  const dialogRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const finish = useCallback(
    (status: "done" | "skipped") => {
      try {
        window.localStorage.setItem(storageKey(email), status);
        window.sessionStorage.removeItem(ACTIVE_TOUR_KEY);
      } catch {
        // The tour still works when storage is unavailable.
      }
      setOpen(false);
    },
    [email],
  );

  const start = useCallback(() => {
    setStepIndex(0);
    setRect(null);
    setOpen(true);
    try {
      window.sessionStorage.setItem(ACTIVE_TOUR_KEY, "0");
    } catch {
      // Navigation can still continue without cross-page restore.
    }
  }, []);

  // The app shell remounts on navigation, so an in-progress tour restores
  // its step from session storage after each route change.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(ACTIVE_TOUR_KEY);
      if (raw === null) return;
      const restored = Number(raw);
      if (Number.isInteger(restored) && restored >= 0 && restored < STEPS.length) {
        setStepIndex(restored);
        setOpen(true);
      }
    } catch {
      // Ignore unavailable session storage.
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    try {
      window.sessionStorage.setItem(ACTIVE_TOUR_KEY, String(stepIndex));
    } catch {
      // Ignore unavailable session storage.
    }
  }, [open, stepIndex]);

  // Offer the tour once, on the dashboard, to a signed-in user who has not
  // already finished or skipped it on this browser.
  useEffect(() => {
    if (!email || pathname !== "/dashboard") return;
    let seen: string | null = null;
    try {
      if (window.sessionStorage.getItem(ACTIVE_TOUR_KEY) !== null) return;
      seen = window.localStorage.getItem(storageKey(email));
    } catch {
      seen = null;
    }
    if (seen === "done" || seen === "skipped") return;
    const timer = window.setTimeout(() => {
      setStepIndex(0);
      setOpen(true);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [email, pathname]);

  useEffect(() => {
    window.addEventListener(PRODUCT_TOUR_EVENT, start);
    return () => window.removeEventListener(PRODUCT_TOUR_EVENT, start);
  }, [start]);

  // Keep the highlight aligned while the user resizes or scrolls.
  useEffect(() => {
    function syncViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const measure = useCallback(() => {
    if (!step.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (!el) {
      setRect(null);
      return;
    }
    const box = el.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) {
      setRect(null);
      return;
    }
    setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
  }, [step.selector]);

  // Move to the step's page, then wait briefly for its anchor to render.
  useEffect(() => {
    if (!open) return;
    if (step.route && pathname !== step.route) {
      router.push(step.route);
    }
    if (!step.selector) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    let scrolled = false;
    const timer = window.setInterval(() => {
      attempts += 1;
      const el = document.querySelector(step.selector as string);
      if (el && !scrolled) {
        const box = el.getBoundingClientRect();
        if (box.width > 0 && (box.top < 0 || box.bottom > window.innerHeight)) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          scrolled = true;
        }
      }
      if (!cancelled) measure();
      if (attempts >= 18 || (el && attempts >= 3)) {
        window.clearInterval(timer);
      }
    }, 90);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, step.route, step.selector, pathname, router, measure]);

  useEffect(() => {
    if (!open || !rect) return;
    function onMove() {
      measure();
    }
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, rect, measure]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") finish("skipped");
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, finish]);

  const popoverStyle = useMemo<CSSProperties>(() => {
    const width = Math.min(360, Math.max(280, viewport.width - 32));
    if (!rect) {
      return {
        width,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
    }
    // Sidebar targets sit on the left: place the card beside them.
    if (rect.left < 320) {
      return {
        width,
        left: clamp(rect.left + rect.width + 16, 16, viewport.width - width - 16),
        top: clamp(rect.top - 8, 84, viewport.height - 300),
      };
    }
    const below = rect.top + rect.height + 268 < viewport.height;
    return {
      width,
      left: clamp(rect.left, 16, viewport.width - width - 16),
      top: below ? rect.top + rect.height + 14 : clamp(rect.top - 268, 16, viewport.height - 300),
    };
  }, [rect, viewport]);

  if (!open) return null;

  const highlighted = rect
    ? {
        top: Math.max(0, rect.top - 6),
        left: Math.max(0, rect.left - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[70]" aria-live="polite">
      {highlighted ? (
        <>
          <div className="absolute bg-foreground/45" style={{ top: 0, left: 0, right: 0, height: highlighted.top }} />
          <div
            className="absolute bg-foreground/45"
            style={{ top: highlighted.top + highlighted.height, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className="absolute bg-foreground/45"
            style={{ top: highlighted.top, left: 0, width: highlighted.left, height: highlighted.height }}
          />
          <div
            className="absolute bg-foreground/45"
            style={{
              top: highlighted.top,
              left: highlighted.left + highlighted.width,
              right: 0,
              height: highlighted.height,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-xl border-2 border-primary bg-primary/5 shadow-lift"
            style={highlighted}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-foreground/45" />
      )}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-tour-title"
        aria-describedby="product-tour-body"
        tabIndex={-1}
        className="absolute rounded-xl border border-border bg-card text-card-foreground shadow-lift outline-none"
        style={popoverStyle}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <p className="text-xs font-semibold text-muted-foreground">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-mr-2 -mt-1 h-8 w-8 px-0"
            onClick={() => finish("skipped")}
            aria-label="Close tour"
          >
            <X size={16} aria-hidden />
          </Button>
        </div>
        <div className="px-5 pb-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <h2 id="product-tour-title" className="mt-4 text-lg font-bold tracking-tight">
            {step.title}
          </h2>
          <p id="product-tour-body" className="mt-2 text-sm leading-6 text-muted-foreground">
            {step.body}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {!isFirst ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setStepIndex((i) => Math.max(0, i - 1))}>
                <ArrowLeft size={14} aria-hidden /> Back
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => finish("skipped")}
            >
              Skip tour
            </Button>
            <Button
              type="button"
              size="sm"
              className="ml-auto"
              onClick={() => {
                if (isLast) finish("done");
                else setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
              }}
            >
              {isLast ? (
                <>
                  <Check size={14} aria-hidden /> {step.primaryLabel ?? "Finish"}
                </>
              ) : (
                <>
                  {step.primaryLabel ?? "Next"} <ArrowRight size={14} aria-hidden />
                </>
              )}
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={cn("h-1.5 rounded-full transition-all duration-200", i === stepIndex ? "w-5 bg-primary" : "w-1.5 bg-border")}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


