import type { Tool } from "@/lib/db/schema";
import {
  CATEGORY_LABELS,
  SOURCE_LABELS,
  hostnameFromUrl,
} from "@/lib/utils";

function engagement(tool: Pick<Tool, "scorePeak" | "commentsPeak">): number {
  return tool.scorePeak * 3 + tool.commentsPeak;
}

export type CommandKind = "action" | "tool" | "aisle" | "nav" | "filter";

export type CommandHit = {
  id: string;
  label: string;
  hint: string;
  href: string;
  kind: CommandKind;
  score: number;
  preview?: string | null;
  accent?: string | null;
};

function scoreField(hay: string, needle: string): number {
  if (!needle) return 0;
  const h = hay.toLowerCase();
  const n = needle.toLowerCase();
  if (!h) return 0;
  if (h === n) return 1000;
  if (h.startsWith(n)) return 820;
  const idx = h.indexOf(n);
  if (idx >= 0) return Math.max(420 - idx, 180);
  const tokens = n.split(/\s+/).filter((t) => t.length >= 2);
  if (!tokens.length) return 0;
  let hits = 0;
  for (const t of tokens) {
    if (h.includes(t)) hits += 1;
  }
  if (hits === 0) return 0;
  if (hits === tokens.length) return 360 + hits * 20;
  return 120 + hits * 40;
}

export function scoreTool(tool: Tool, needle: string): number {
  const host = hostnameFromUrl(tool.url);
  const cats = (tool.categories ?? [])
    .map((c) => CATEGORY_LABELS[c] ?? c)
    .join(" ");
  const boards = (tool.sources ?? [])
    .map((s) => SOURCE_LABELS[s] ?? s)
    .join(" ");

  const name = scoreField(tool.name, needle) * 3;
  const summary = scoreField(tool.summary, needle);
  const hostScore = scoreField(host, needle) * 2.2;
  const catScore = scoreField(cats, needle) * 1.6;
  const boardScore = scoreField(boards, needle) * 1.4;
  const best = Math.max(name, summary, hostScore, catScore, boardScore);
  if (best <= 0) return 0;
  return best + Math.min(engagement(tool), 120) * 0.08;
}

export function rankByEngagement(tools: Tool[], limit = 6): Tool[] {
  return [...tools]
    .sort((a, b) => engagement(b) - engagement(a))
    .slice(0, limit);
}

export function scoreText(label: string, hint: string, needle: string): number {
  return Math.max(scoreField(label, needle) * 2.4, scoreField(hint, needle));
}

/** Highlight the first needle match inside text (safe for React children). */
export function splitHighlight(
  text: string,
  needle: string,
): Array<{ text: string; hit: boolean }> {
  const q = needle.trim();
  if (!q) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return [{ text, hit: false }];
  const end = idx + q.length;
  return [
    ...(idx > 0 ? [{ text: text.slice(0, idx), hit: false }] : []),
    { text: text.slice(idx, end), hit: true },
    ...(end < text.length ? [{ text: text.slice(end), hit: false }] : []),
  ];
}
