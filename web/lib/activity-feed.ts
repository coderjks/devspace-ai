export type TransitionPayload = {
  key?: string;
  from?: string;
  to?: string;
};

export type FeedEvent = {
  id: string;
  actor: string | null;
  action: string;
  object_type: string | null;
  object_id: string | null;
  payload?: TransitionPayload | null;
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
export function describeEvent(e: {
  action: string;
  actor?: string | null;
  object_type?: string | null;
  object_id?: string | null;
  payload?: TransitionPayload | null;
}): string {
  const actor = e.actor ?? "";
  if (e.action === "agent_reply" && actor.startsWith("agent:")) {
    return `${personaLabel(actor.slice("agent:".length))} replied in chat`;
  }
  if (e.action === "task.transition") {
    // The key (AI-001) is the human handle; the UUID in object_id must never
    // reach the UI. Older rows predate payload logging — fall back to a
    // generic sentence rather than leaking the id.
    const key = e.payload?.key;
    const from = e.payload?.from;
    const to = e.payload?.to;
    if (key && from && to) return `${key} moved from ${from} to ${to}`;
    if (key) return `${key} changed status`;
    return "A task changed status";
  }
  const sentences: Record<string, string> = {
    "enrollment.created": "You enrolled in the internship",
    "standup.proposed": "You drafted a standup",
    "standup.confirmed": "You confirmed a standup",
    "password.changed": "You changed your password",
    "enrollment.skill_updated": "You updated your skill level",
    "evaluation.completed": "An evaluation finished",
    "submission.created": "You submitted a pull request",
  };
  return sentences[e.action] ?? e.action.replace(/[._]/g, " ");
}
