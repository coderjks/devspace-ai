# DevSpace AI — Design System

Living reference for all UI work. If this document and the code disagree, the code wins — then update this document.

## 1. Principles

- Professional developer platform, not a gaming dashboard or neon showcase.
- Semantic tokens everywhere: pages reference `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, never raw hex.
- Light mode is the default; dark mode is a full companion, not an afterthought.
- Readability first: 16px base, generous line height, comfortable measure.
- Depth through layering: soft layered shadows and token-tinted glows, never harsh black washes or neon effects.
- Motion is purposeful and restrained: entrances orient, hovers confirm, state changes acknowledge. Always honors `prefers-reduced-motion` (global kill-switch in `globals.css`).

## 2. Palettes

### Light — Soft Slate + Indigo (default)

| Token | Value | Use |
|---|---|---|
| Background | `#F7F8FA` | Page backdrop |
| Card | `#FFFFFF` | Surfaces |
| Foreground | `#1E293B` | Primary text |
| Muted fg | `#475569` (darkened to 40% L for AA) | Secondary text |
| Primary | `#4F46E5` | Buttons, active states, links |
| Secondary | `#F1F5F9` | Subtle fills |
| Accent / Accent fg | `#EEF2FF` / `#4338CA` | Tinted highlights |
| Border | `#E2E8F0` | Dividers, inputs |

### Dark — Midnight Slate + Soft Blue

| Token | Value | Use |
|---|---|---|
| Background | `#171D29` | Page backdrop |
| Card | `#222B3A` | Surfaces |
| Foreground | `#E9EEF6` | Primary text |
| Muted fg | `#BCC9DA` | Secondary text |
| Primary | `#2563EB` | Buttons, active states |
| Secondary | `#303A49` | Subtle fills |
| Accent / Accent fg | `#263D5B` / `#BFDBFE` | Tinted highlights |
| Border | `#374151` | Dividers, inputs |

## 3. Semantic token map

Implemented as CSS variables in `web/app/globals.css` (`:root` + `.dark`), consumed through Tailwind (`web/tailwind.config.ts`, `darkMode: "class"`):

- `background`, `foreground`, `card` + `card-foreground`, `popover` + `popover-foreground`
- `primary` + `primary-foreground`, `secondary` + `secondary-foreground`
- `muted` + `muted-foreground`, `accent` + `accent-foreground`
- `border`, `input`, `ring`
- `destructive` + `destructive-foreground` (errors, delete actions)
- `success` / `warning` / `info` + foregrounds (status text, badges, review states)
- `chart-1` … `chart-5` (metrics, progress visuals)
- `sidebar` + `sidebar-foreground/primary/accent/border/ring` (reserved for future navigation surfaces)

Status convention: tinted background + colored text (`bg-success/15 text-success`), never color alone — always pair with a label or icon.

## 4. Typography and spacing

- System font stack (no webfont download; keeps builds offline-safe).
- Base 16px, body `line-height: 1.6`. Headings: page `text-2xl`–`text-4xl` bold tight; section `text-3xl/4xl`; card titles semibold.
- Display scale (landing/hero only): `text-[2.75rem] md:text-6xl font-extrabold tracking-tight leading-[1.04]`, with one `text-primary` accent span at most. Use `text-balance` on display headings, `text-pretty` on supporting copy.
- Kickers: `text-xs font-semibold uppercase tracking-[0.18em] text-primary` with a dot (see `Eyebrow`).
- 8px rhythm via Tailwind spacing scale. Max content width `max-w-7xl` (landing), `max-w-5xl`/`4xl` (app).
- Never shrink body text below `text-sm` to fit more content.

## 4b. Surface elevation

Three levels, token-derived so both themes stay calm. Shadows must never read as dark smudges in light mode or muddy halos in dark mode:

- `shadow-soft` — resting surfaces (cards, auth panel, nav when scrolled).
- `shadow-lift` — hovered cards, floating proof chips, workspace preview, final CTA panel. Pair with `-translate-y-0.5`/`-translate-y-1`.
- `shadow-glow` — reserved for the primary focus moment (hero preview ring). Never on buttons or body text.
- Rings: `ring-1 ring-foreground/5` on large preview surfaces for edge definition; `border-primary/40 ring-1 ring-primary/20` to mark the "current/active" card.
- Backdrops: `.glow-conic` (soft radial primary/info tints, theme-adjusted) and `.bg-blueprint` (faint grid, masked) — hero and brand/CTA panels only. Never full-page washes.

## 5. Component conventions (shadcn/ui)

- `Button`: default = primary; `outline` for secondary actions; `ghost` for nav/toggles. Heights: `sm` 32px, default 36px, `lg` 44px. All variants lift on hover (`-translate-y-px` + deeper shadow, 150ms) and settle on `:active`; primary buttons pair with a trailing arrow that nudges on hover (`group/btn`).
- `Card`: `bg-card text-card-foreground`, `rounded-xl` (12px), restrained `border-border`, `shadow-soft` resting; interactive cards rise to `shadow-lift` on hover.
- `Input`: `border-input bg-background`, hover border deepening, visible `ring-ring/40` focus, `aria-invalid` + `text-destructive` messages for errors.
- `StatusBadge`: icon + label pill per state (todo/info, in_progress/primary, in_review/warning, approved/success, locked/muted). Never color alone.
- `Skeleton` + `LoadingStatus`: shimmer blocks for async regions with an `sr-only role="status"` label. `EmptyState`: icon tile + title + one-line hint.
- Radius: `lg 12px`, `md 10px`, `sm 8px`. Buttons use `rounded-lg`, large CTAs `rounded-xl`.
- Icons: Lucide only, `aria-hidden` when decorative, labeled controls otherwise.
- `code`/`pre`: muted surfaces in both themes (see `globals.css`).

## 5b. Motion tokens and usage

No animation library: CSS keyframes + one `Reveal` component (`components/motion/reveal.tsx`, IntersectionObserver, fires once, `--reveal-delay` stagger).

- Durations: microinteractions (`hover`, `focus`, tab switches) 120–200ms; component transitions (cards, accordion, dialogs) 180–300ms; section entrances 350–550ms; hero reveal 450–650ms staggered (`--enter-delay`, class `enter-rise`).
- Curves: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out) for entrances; `ease-out`/`ease-in-out` 150–200ms for state changes.
- Prefer `transform` + `opacity` only. No layout-affecting animation, no scroll-jacking, no autoplay, no continuous floating/pulsing loops. The shimmer keyframe exists for loading skeletons only.
- Appropriate: fade-rise on first paint, stagger ≤ 700ms total, hover lift on cards/buttons, chevron rotate + grid-rows accordion in FAQ, spinner (`animate-spin`) on submitting buttons with `aria-busy`.
- Inappropriate: per-letter text animation, parallax backgrounds, animated gradients, persistent glow pulsing, entrance on every keystroke or route-change re-trigger without cause.
- Reduced motion: `Reveal` renders content immediately when `prefers-reduced-motion` matches; the global kill-switch collapses all durations. Verify with OS reduced-motion on.

## 6. Accessibility

- WCAG AA for normal text (tokens were contrast-checked when introduced).
- Visible `:focus-visible` ring on all interactives (global rule).
- Errors use `role="alert"`; status updates use `role="status"`.
- Form fields always labeled with matching `htmlFor`/`id` + `autocomplete`.
- Touch targets ≥ 40px for primary actions; icon-only buttons carry `aria-label`.

## 7. Theming behavior

- `ThemeProvider` (`components/theme-provider.tsx`): `next-themes`, `attribute="class"`, `defaultTheme="light"`, `enableSystem`. Preference persists in `localStorage` across navigation and reloads; System follows the OS setting. `suppressHydrationWarning` on `<html>` + mounted guard in the toggle prevent hydration mismatch.
- `ThemeToggle` (`components/theme-toggle.tsx`): explicit Light / Dark / System menu (checkmark on active, Escape/outside-click close, honest `aria-label`). Mounted in the landing `Navbar` and the app `SiteHeader`.
- Rules: never hardcode theme-specific colors in pages; test every new screen in both themes; `dark:` overrides are allowed only for illustrative mock content, never for real UI.

## 8. Responsive

- Mobile-first; grids collapse to one column; tables scroll horizontally inside `overflow-x-auto` wrappers; tap targets comfortable; no horizontal overflow at 375px.

## 9. Rules for future screens

1. Use tokens, not hex. 2. Add missing shadcn/ui components from official Radix-based sources only. 3. No new dependencies without a documented reason. 4. Keep the app runnable and the docs updated.
