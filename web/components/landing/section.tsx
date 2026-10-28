import { cn } from "@/lib/utils";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
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
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <section id={id} aria-label={title} className="mx-auto w-full max-w-7xl scroll-mt-20 px-6 py-16 md:py-24">
      <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h2>
        {description ? <p className="mt-4 text-base leading-7 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="mt-10">{children}</div>
    </section>
  );
}
