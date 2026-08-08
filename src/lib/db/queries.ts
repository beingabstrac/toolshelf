import { and, asc, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import { getDb } from "./index";
import { candidates, sourceMentions, tools, type Tool, type ToolCategory } from "./schema";
import { SOURCE_LABELS, formatRelative } from "@/lib/utils";

export type ToolSort = "top" | "newest" | "discussed";

/** Cross-source engagement: votes/points first, then discussion. */
export function engagementScore(tool: {
  scorePeak: number;
  commentsPeak: number;
}): number {
  return tool.scorePeak * 3 + tool.commentsPeak;
}

export async function listTools(options: {
  q?: string;
  category?: string;
  source?: string;
  sort?: ToolSort;
  limit?: number;
  offset?: number;
}): Promise<Tool[]> {
  const db = getDb();
  const limit = options.limit ?? 48;
  const offset = options.offset ?? 0;
  const sort = options.sort ?? "top";

  const filters = [eq(tools.status, "published")];

  if (options.category) {
    filters.push(sql`${options.category} = ANY(${tools.categories})`);
  }

  if (options.source) {
    filters.push(sql`${options.source} = ANY(${tools.sources})`);
  }

  if (options.q?.trim()) {
    const q = `%${options.q.trim()}%`;
    filters.push(
      or(ilike(tools.name, q), ilike(tools.summary, q), ilike(tools.url, q))!,
    );
  }

  const engagement = sql`(${tools.scorePeak} * 3 + ${tools.commentsPeak})`;
  // Soft-demote tools whose product URL looks dead
  const healthyFirst = sql`case when ${tools.urlStatus} = 'broken' then 1 else 0 end`;

  if (sort === "discussed") {
    return db
      .select()
      .from(tools)
      .where(and(...filters))
      .orderBy(
        asc(healthyFirst),
        desc(tools.commentsPeak),
        desc(tools.scorePeak),
      )
      .limit(limit)
      .offset(offset);
  }

  if (sort === "newest") {
    return db
      .select()
      .from(tools)
      .where(and(...filters))
      .orderBy(asc(healthyFirst), desc(tools.firstSeenAt))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(tools)
    .where(and(...filters))
    .orderBy(asc(healthyFirst), desc(engagement), desc(tools.firstSeenAt))
    .limit(limit)
    .offset(offset);
}

export async function countTools(options: {
  q?: string;
  category?: string;
  source?: string;
}): Promise<number> {
  const db = getDb();
  const filters = [eq(tools.status, "published")];

  if (options.category) {
    filters.push(sql`${options.category} = ANY(${tools.categories})`);
  }
  if (options.source) {
    filters.push(sql`${options.source} = ANY(${tools.sources})`);
  }
  if (options.q?.trim()) {
    const q = `%${options.q.trim()}%`;
    filters.push(
      or(ilike(tools.name, q), ilike(tools.summary, q), ilike(tools.url, q))!,
    );
  }

  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tools)
    .where(and(...filters));
  return rows[0]?.count ?? 0;
}

export async function getToolBySlug(slug: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(tools)
    .where(and(eq(tools.slug, slug), eq(tools.status, "published")))
    .limit(1);
  return rows[0] ?? null;
}

/** Tools first seen in [start, end). Newest first. */
export async function listToolsSeenBetween(
  start: Date,
  end: Date,
  limit = 80,
): Promise<Tool[]> {
  const db = getDb();
  return db
    .select()
    .from(tools)
    .where(
      and(
        eq(tools.status, "published"),
        gte(tools.firstSeenAt, start),
        lt(tools.firstSeenAt, end),
      ),
    )
    .orderBy(desc(tools.firstSeenAt))
    .limit(limit);
}

/**
 * Prefer persisted inclusionReason; else pull classifier reason from an
 * accepted candidate with the same URL. Fallback is plain shelf copy.
 */
export async function resolveInclusionReason(tool: Tool): Promise<string> {
  const stored = tool.inclusionReason?.trim();
  if (stored) return stored;

  try {
    const db = getDb();
    const rows = await db
      .select({ classification: candidates.classification })
      .from(candidates)
      .where(
        and(eq(candidates.decision, "accepted"), eq(candidates.url, tool.url)),
      )
      .limit(8);

    for (const row of rows) {
      const c = row.classification as { reason?: string } | null;
      const reason = c?.reason?.trim();
      if (reason) return reason.slice(0, 280);
    }
  } catch {
    // ignore join failures; use fallback
  }

  const boards = (tool.sources ?? [])
    .map((s) => SOURCE_LABELS[s] ?? s)
    .filter(Boolean);
  const boardBit =
    boards.length > 1
      ? `Seen on ${boards.slice(0, 3).join(", ")}`
      : boards[0]
        ? `Seen on ${boards[0]}`
        : "From launch boards";
  const when = formatRelative(new Date(tool.firstSeenAt));
  const score =
    tool.scorePeak > 0
      ? ` Best score ${tool.scorePeak.toLocaleString()}.`
      : "";
  return `${boardBit}. First seen ${when}.${score}`;
}

export async function getMentionsForTool(toolId: number) {
  const db = getDb();
  return db
    .select()
    .from(sourceMentions)
    .where(eq(sourceMentions.toolId, toolId))
    .orderBy(desc(sourceMentions.createdAt));
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "your",
  "you",
  "that",
  "this",
  "tool",
  "app",
  "apps",
  "api",
  "open",
  "source",
]);

function tokensFor(tool: Pick<Tool, "name" | "summary">): Set<string> {
  const raw = `${tool.name} ${tool.summary}`.toLowerCase();
  const parts = raw.split(/[^a-z0-9+]+/).filter(Boolean);
  return new Set(
    parts.filter((w) => w.length >= 3 && !STOP_WORDS.has(w)).slice(0, 24),
  );
}

/** Rank related tools from an in-memory pool (no extra DB round-trips). */
export function pickRelatedTools(
  tool: Tool,
  pool: Tool[],
  limit = 6,
): Tool[] {
  const categories = tool.categories ?? [];
  const seedTokens = tokensFor(tool);
  // Domain specific categories (ignore generic 'dev' and 'product' unless they are the only categories)
  const specificCategories = categories.filter(
    (c) => c !== "dev" && c !== "product",
  );
  const targetCategories = specificCategories.length
    ? specificCategories
    : categories;

  return pool
    .filter((row) => row.id !== tool.id)
    .map((candidate) => {
      const candCats = candidate.categories ?? [];
      const sharedSpecific = candCats.filter((c) =>
        targetCategories.includes(c as ToolCategory),
      ).length;
      const sharedAll = candCats.filter((c) => categories.includes(c)).length;

      const candTokens = tokensFor(candidate);
      let keywordHits = 0;
      for (const t of seedTokens) {
        if (candTokens.has(t)) keywordHits += 1;
      }

      const specificMatchBonus = sharedSpecific > 0 ? 400 : 0;
      const keywordBonus = Math.min(keywordHits, 6) * 75;
      const brokenPenalty = candidate.urlStatus === "broken" ? 300 : 0;

      const score =
        specificMatchBonus +
        sharedSpecific * 150 +
        sharedAll * 30 +
        keywordBonus +
        engagementScore(candidate) * 0.05 -
        brokenPenalty;

      return {
        candidate,
        score,
        sharedSpecific,
        keywordHits,
      };
    })
    .filter((row) => row.sharedSpecific > 0 || row.keywordHits >= 1)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.keywordHits - a.keywordHits ||
        b.sharedSpecific - a.sharedSpecific,
    )
    .slice(0, limit)
    .map((row) => row.candidate);
}

/** Fallback when no cached shelf is available — one query, not four. */
export async function listRelatedTools(
  tool: Tool,
  limit = 6,
): Promise<Tool[]> {
  const pool = await listTools({ sort: "top", limit: 2500 });
  return pickRelatedTools(tool, pool, limit);
}
