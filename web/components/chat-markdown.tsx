"use client";

import { useMemo } from "react";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CODE = "rounded bg-muted px-1 py-0.5 font-mono text-[13px]";
const LINK = "font-medium text-primary hover:underline";

/** Inline markdown for already-escaped text: code, bold, italic, links. */
function inline(escaped: string): string {
  return escaped
    .replace(
      /`([^`\n]+)`/g,
      (_m, code: string) => `<code class="${CODE}">${code}</code>`
    )
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong class=\"font-semibold\">$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      `<a class="${LINK}" href="$2" target="_blank" rel="noreferrer">$1</a>`
    );
}

type Block =
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "p"; text: string };

function blocks(text: string): Block[] {
  const out: Block[] = [];
  let current: Block | null = null;
  const pushLine = (b: Block) => {
    if (
      current &&
      (current.kind === "ul" || current.kind === "ol") &&
      b.kind === current.kind
    ) {
      (current as { items: string[] }).items.push((b as { items: string[] }).items[0]);
    } else {
      if (current) out.push(current);
      current = b;
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (current) {
        out.push(current);
        current = null;
      }
      continue;
    }
    const ul = line.match(/^\s*[*\-]\s+(.*)$/);
    if (ul) {
      pushLine({ kind: "ul", items: [ul[1]] });
      continue;
    }
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ol) {
      pushLine({ kind: "ol", items: [ol[1]] });
      continue;
    }
    pushLine({ kind: "p", text: line.trim() });
  }
  if (current) out.push(current);
  return out;
}

/**
 * Minimal chat markdown: agent replies use **bold**, * bullets, 1. numbered
 * lists, `code`, and [links](https://…). Raw HTML is escaped first, so this
 * never injects author-controlled tags — only the five above are emitted.
 */
export function ChatMarkdown({ text }: { text: string }) {
  const html = useMemo(() => {
    const parts: string[] = [];
    for (const b of blocks(text)) {
      if (b.kind === "ul") {
        parts.push(
          `<ul class="list-disc space-y-1 pl-5">${b.items.map((i) => `<li>${inline(escapeHtml(i))}</li>`).join("")}</ul>`
        );
      } else if (b.kind === "ol") {
        parts.push(
          `<ol class="list-decimal space-y-1 pl-5">${b.items.map((i) => `<li>${inline(escapeHtml(i))}</li>`).join("")}</ol>`
        );
      } else {
        const t = inline(escapeHtml(b.text));
        parts.push(t ? `<p>${t}</p>` : "");
      }
    }
    return parts.filter(Boolean).join("");
  }, [text]);
  return (
    <div
      className="space-y-1.5 whitespace-pre-wrap text-sm leading-6 [&_p]:m-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
