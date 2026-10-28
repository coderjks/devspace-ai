"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light", hint: "Always light" },
  { value: "dark", icon: Moon, label: "Dark", hint: "Always dark" },
  { value: "system", icon: Monitor, label: "System", hint: "Follow your device setting" },
] as const;

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        disabled={!mounted}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Color theme (currently ${theme ?? "light"}). Open theme options.`}
        title="Change color theme"
        className="text-muted-foreground hover:text-foreground"
      >
        {mounted ? <ActiveIcon size={17} aria-hidden /> : <Sun size={17} aria-hidden />}
        <span className="sr-only">Theme options</span>
      </Button>
      {open ? (
        <div
          role="menu"
          aria-label="Color theme"
          className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              role="menuitemradio"
              aria-checked={mounted && theme === o.value}
              onClick={() => {
                setTheme(o.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                mounted && theme === o.value && "font-medium"
              )}
            >
              <o.icon size={15} aria-hidden className="shrink-0 text-muted-foreground" />
              <span className="flex-1">
                {o.label}
                <span className="block text-xs font-normal text-muted-foreground">{o.hint}</span>
              </span>
              {mounted && theme === o.value ? <Check size={15} aria-hidden className="shrink-0 text-primary" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
