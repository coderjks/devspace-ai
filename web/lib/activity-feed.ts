export type FeedEvent = {
  id: string;
  actor: string | null;
  action: string;
  object_type: string | null;
  object_id: string | null;
  created_at: string;
};

function personaLabel(persona: string): string {
  return persona
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
}

/** Best-effort human sentence for a raw system event. Unknown actions fall
 * back to a prettified action name rather than raw `snake.case` internals. */
export function describeEvent(e: FeedEvent): string {
  const actor = e.actor ?? "";
  if (e.action === "agent_reply" && actor.startsWith("agent:")) {
    return `${personaLabel(actor.slice("agent:".length))} replied in chat`;
  }
  const sentences: Record<string, string> = {
    "enrollment.created": "You enrolled in the internship",
    "standup.proposed": "You drafted a standup",
    "standup.confirmed": "You confirmed a standup",
    "task.transition": e.object_id ? `Task ${e.object_id} changed status` : "A task changed status",
    "password.changed": "You changed your password",
    "enrollment.skill_updated": "You updated your skill level",
    "evaluation.completed": "An evaluation finished",
    "submission.created": "You submitted a pull request",
  };
  return sentences[e.action] ?? e.action.replace(/[._]/g, " ");
}
