import { GitPullRequest, Mic } from "lucide-react";

const COLUMNS = [
  { title: "Backlog", cards: ["Setup authentication system", "Create UI component library"] },
  { title: "In Progress", cards: ["Implement database schema", "Build API endpoints"] },
  { title: "Review", cards: ["Add unit tests"] },
  { title: "Done", cards: ["Update docs"] },
];

export function WorkspaceMiniPreview() {
  return (
    <div
      role="img"
      aria-label="Illustrative preview of a sprint board and AI teammate chat with sample data"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
        <span className="ml-2 text-[11px] text-muted-foreground">Sprint 1: Build the Foundation · 4 of 6 tasks</span>
      </div>
      <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{col.title}</p>
            <div className="mt-1.5 space-y-1.5">
              {col.cards.map((c) => (
                <div key={c} className="rounded-md border border-border bg-card p-2 text-[11px] leading-4 text-muted-foreground">
                  {c}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border p-3">
        <p className="text-[11px] font-semibold text-foreground">AI Team Chat</p>
        <div className="mt-2 space-y-1.5 text-[11px] leading-5">
          <p className="max-w-[85%] rounded-md rounded-bl-none border border-border bg-muted px-2.5 py-1.5 text-muted-foreground">
            How can I help you with the authentication task?
          </p>
          <p className="ml-auto max-w-[85%] rounded-md rounded-br-none bg-primary px-2.5 py-1.5 text-primary-foreground">
            I&apos;m trying to implement JWT authentication. What approach fits this project?
          </p>
          <p className="max-w-[85%] rounded-md rounded-bl-none border border-border bg-muted px-2.5 py-1.5 text-muted-foreground">
            Here&apos;s a recommended approach…
          </p>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <GitPullRequest size={11} aria-hidden /> PR checks green · <Mic size={11} aria-hidden /> standup transcribed
        </p>
      </div>
    </div>
  );
}
