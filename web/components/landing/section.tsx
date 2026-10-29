import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </p>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  align = "center",
  tone = "default",
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  align?: "left" | "center";
  tone?: "default" | "muted";
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className={cn("scroll-mt-20", tone === "muted" && "border-y border-border bg-muted/40")}
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:py-24">
        <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
          <div className={cn(align === "center" && "flex justify-center")}>
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-[2.75rem] md:leading-[1.1]">
            {title}
          </h2>
          {description ? <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground">{description}</p> : null}
        </Reveal>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
