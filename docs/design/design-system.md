# DevSpace AI — Design System

Living reference for all UI work. If this document and the code disagree, the code wins — then update this document.

## 1. Principles

- Professional developer platform, not a gaming dashboard or neon showcase.
- Semantic tokens everywhere: pages reference `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, never raw hex.
- Light mode is the default; dark mode is a full companion, not an afterthought.
- Readability first: 16px base, generous line height, comfortable measure.
- Motion is minimal and always honors `prefers-reduced-motion` (global kill-switch in `globals.css`).

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
- 8px rhythm via Tailwind spacing scale. Max content width `max-w-7xl` (landing), `max-w-5xl`/`4xl` (app).
- Never shrink body text below `text-sm` to fit more content.

## 5. Component conventions (shadcn/ui)

- `Button`: default = primary; `outline` for secondary actions; `ghost` for nav/toggles. Heights: `sm` 32px, default 36px, `lg` 40px.
- `Card`: `bg-card text-card-foreground`, `rounded-xl` (12px), restrained `border-border`, `shadow-sm` at most.
- `Input`: `border-input bg-background`, visible `ring-ring` focus, `aria-invalid` + `text-destructive` messages for errors.
- Radius: `lg 12px`, `md 10px`, `sm 8px`.
- Icons: Lucide only, `aria-hidden` when decorative, labeled controls otherwise.
- `code`/`pre`: muted surfaces in both themes (see `globals.css`).

## 6. Accessibility

- WCAG AA for normal text (tokens were contrast-checked when introduced).
- Visible `:focus-visible` ring on all interactives (global rule).
- Errors use `role="alert"`; status updates use `role="status"`.
- Form fields always labeled with matching `htmlFor`/`id` + `autocomplete`.
- Touch targets ≥ 40px for primary actions; icon-only buttons carry `aria-label`.

## 7. Theming behavior

- `ThemeProvider` (`components/theme-provider.tsx`): `next-themes`, `attribute="class"`, `defaultTheme="light"`, `enableSystem`. Preference persists in `localStorage` across navigation and reloads; System follows the OS setting. `suppressHydrationWarning` on `<html>` + mounted guard in the toggle prevent hydration mismatch.
- `ThemeToggle` (`components/theme-toggle.tsx`): one button cycling Light → Dark → System with an honest `aria-label`. Mounted in the landing `Navbar` and the app `SiteHeader`.
- Rules: never hardcode theme-specific colors in pages; test every new screen in both themes; `dark:` overrides are allowed only for illustrative mock content, never for real UI.

## 8. Responsive

- Mobile-first; grids collapse to one column; tables scroll horizontally inside `overflow-x-auto` wrappers; tap targets comfortable; no horizontal overflow at 375px.

## 9. Rules for future screens

1. Use tokens, not hex. 2. Add missing shadcn/ui components from official Radix-based sources only. 3. No new dependencies without a documented reason. 4. Keep the app runnable and the docs updated.
