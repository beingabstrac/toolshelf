import type { Tool } from "@/lib/db/schema";

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Tools first seen in the last 7 days, newest first. */
export function pickWeeklyDrop(tools: Tool[]): Tool[] {
  const cutoff = Date.now() - WEEK_MS;
  return [...tools]
    .filter((t) => new Date(t.firstSeenAt).getTime() >= cutoff)
    .sort(
      (a, b) =>
        new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
    );
}

/** ISO week id like 2026-W32 (UTC). */
export function isoWeekId(date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // Thursday in current week decides the year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function parseWeekId(
  weekId: string,
): { year: number; week: number } | null {
  const m = /^(\d{4})-W(\d{2})$/i.exec(weekId.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (!Number.isFinite(year) || week < 1 || week > 53) return null;
  return { year, week };
}

/** Monday 00:00 UTC → next Monday 00:00 UTC for an ISO week. */
export function weekRange(weekId: string): { start: Date; end: Date } | null {
  const parsed = parseWeekId(weekId);
  if (!parsed) return null;
  const { year, week } = parsed;
  // ISO week 1 contains Jan 4
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - day + 1);
  const start = new Date(mondayWeek1);
  start.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}

export function pickDropForWeek(tools: Tool[], weekId: string): Tool[] {
  const range = weekRange(weekId);
  if (!range) return [];
  const { start, end } = range;
  const startMs = start.getTime();
  const endMs = end.getTime();
  return [...tools]
    .filter((t) => {
      const ts = new Date(t.firstSeenAt).getTime();
      return ts >= startMs && ts < endMs;
    })
    .sort(
      (a, b) =>
        new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
    );
}

/** Recent ISO week ids, newest first (includes current week). */
export function listRecentWeekIds(count = 12, now = new Date()): string[] {
  const ids: string[] = [];
  const cursor = new Date(now);
  for (let i = 0; i < count; i++) {
    ids.push(isoWeekId(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return Array.from(new Set(ids));
}

/** Short range label for the current rolling drop window. */
export function dropWeekLabel(now = new Date()): string {
  const end = now;
  const start = new Date(now.getTime() - WEEK_MS);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startLabel = start.toLocaleDateString("en-US", opts);
  const endLabel = end.toLocaleDateString("en-US", {
    ...opts,
    year: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

/** Human label for an ISO week range. */
export function weekRangeLabel(weekId: string): string {
  const range = weekRange(weekId);
  if (!range) return weekId;
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  const startLabel = range.start.toLocaleDateString("en-US", opts);
  const endDay = new Date(range.end.getTime() - 86400000);
  const endLabel = endDay.toLocaleDateString("en-US", {
    ...opts,
    year: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

export function dropShareText(count: number, names: string[]): string {
  const headline =
    count > 0
      ? `${count} product tools that landed this week`
      : "This week’s shelf drop";
  const list =
    names.length > 0
      ? `\n\n${names.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
      : "";
  return `${headline}${list}\n\nFrom Toolshelf.`;
}
