"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#ai-team", label: "AI Teammates" },
  { href: "#experience", label: "Internship Experience" },
  { href: "#faq", label: "FAQ" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="DevSpace AI home">
      <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
        D
      </span>
      <span className="text-[15px] font-bold tracking-tight text-foreground">DevSpace AI</span>
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <nav aria-label="Primary" className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
        <Logo />
        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-1 lg:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/onboarding">Get Started</Link>
          </Button>
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <button
            className="rounded-md p-2 text-muted-foreground hover:bg-accent"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </nav>
      {open ? (
        <div className="border-t border-border px-6 py-4 lg:hidden">
          <ul className="space-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="flex-1">
              <Link href="/onboarding">Get Started</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
