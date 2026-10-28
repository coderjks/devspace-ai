import Link from "next/link";

const PRODUCT = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#ai-team", label: "AI Teammates" },
  { href: "#experience", label: "Workflows" },
  { href: "/board", label: "Sprint Board" },
  { href: "/progress", label: "Progress" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <p className="flex items-center gap-2">
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
              D
            </span>
            <span className="text-[15px] font-bold tracking-tight text-foreground">DevSpace AI</span>
          </p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            An AI-native simulated engineering internship. A learning environment — not employment
            or accredited training. © 2026 DevSpace AI.
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product</p>
          <ul className="mt-3 space-y-2">
            {PRODUCT.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Get started</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link>
            </li>
            <li>
              <Link href="/onboarding" className="text-sm text-muted-foreground hover:text-foreground">Start Your Internship</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
