import { and, eq, sql } from "drizzle-orm";
import { classifyLaunch, meetsAcceptThreshold } from "@/lib/ai/classify";
import { getDb } from "@/lib/db";
import {
  candidates,
  ingestionCursors,
  tools,
  type Source,
} from "@/lib/db/schema";
import { preferScenePreview } from "@/lib/enrich/media";
import { acceptTool } from "./accept";

function asSource(value: string): Source {
  if (value === "producthunt") return "producthunt";
  if (value === "lobsters") return "lobsters";
  if (value === "reddit") return "reddit";
  if (value === "uneed") return "uneed";
  if (value === "devhunt") return "devhunt";
  return "hackernews";
}

function mentionPermalink(
  source: Source,
  externalId: string,
  payload: unknown,
): string | null {
  if (source === "hackernews") {
    return `https://news.ycombinator.com/item?id=${externalId}`;
  }
  if (source === "producthunt") {
    const slug =
      payload &&
      typeof payload === "object" &&
      "slug" in payload &&
      typeof (payload as { slug: unknown }).slug === "string"
        ? (payload as { slug: string }).slug
        : null;
    if (slug) return `https://www.producthunt.com/posts/${slug}`;
    return `https://www.producthunt.com/posts/${externalId}`;
  }
  if (source === "lobsters") {
    const commentsUrl =
      payload &&
      typeof payload === "object" &&
      "commentsUrl" in payload &&
      typeof (payload as { commentsUrl: unknown }).commentsUrl === "string"
        ? (payload as { commentsUrl: string }).commentsUrl
        : null;
    return commentsUrl || `https://lobste.rs/s/${externalId}`;
  }
  if (source === "reddit") {
    const id = externalId.replace(/^t3_/, "");
    return `https://www.reddit.com/comments/${id}`;
  }
  if (source === "uneed") {
    const uneedUrl =
      payload &&
      typeof payload === "object" &&
      "uneedUrl" in payload &&
      typeof (payload as { uneedUrl: unknown }).uneedUrl === "string"
        ? (payload as { uneedUrl: string }).uneedUrl
        : null;
    return uneedUrl || `https://www.uneed.best/tool/${externalId}`;
  }
  if (source === "devhunt") {
    const devhuntUrl =
      payload &&
      typeof payload === "object" &&
      "devhuntUrl" in payload &&
      typeof (payload as { devhuntUrl: unknown }).devhuntUrl === "string"
        ? (payload as { devhuntUrl: string }).devhuntUrl
        : null;
    return devhuntUrl || `https://devhunt.org/tool/${externalId}`;
  }
  return null;
}

function previewFromPayload(source: Source, payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as {
    thumbnailUrl?: string | null;
    previewImageUrl?: string | null;
  };
  // Only accept real OG/social images — never logos or screenshots.
  if (source === "producthunt") {
    return preferScenePreview(p.previewImageUrl, p.thumbnailUrl);
  }
  return preferScenePreview(p.previewImageUrl, p.thumbnailUrl);
}

function taglineFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { tagline?: string | null };
  return p.tagline ?? null;
}

function topicsFromPayload(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as { topics?: string[] };
  return Array.isArray(p.topics) ? p.topics.filter((t) => typeof t === "string") : [];
}

export async function processPendingCandidates(options?: {
  limit?: number;
}): Promise<{
  processed: number;
  accepted: number;
  rejected: number;
  quotaHit?: boolean;
}> {
  const db = getDb();
  const limit = options?.limit ?? 20;

  const pending = await db
    .select()
    .from(candidates)
    .where(eq(candidates.decision, "pending"))
    .orderBy(sql`${candidates.createdAt} desc`)
    .limit(limit);

  let accepted = 0;
  let rejected = 0;

  for (const row of pending) {
    const source = asSource(row.source);
    try {
      const classification = await classifyLaunch({
        source,
        title: row.title,
        url: row.url,
        tagline: taglineFromPayload(row.payload),
        isShowHn: row.isShowHn,
        points: row.points,
        numComments: row.numComments,
        topics: topicsFromPayload(row.payload),
      });

      const accept = meetsAcceptThreshold(classification, source);
      if (accept) {
        await acceptTool(
          {
            source,
            externalId: row.externalId,
            title: row.title,
            url: row.url,
            score: row.points,
            numComments: row.numComments,
            createdAt: row.createdAt,
            permalink: mentionPermalink(source, row.externalId, row.payload),
            isShowHn: row.isShowHn,
            previewImageUrl: previewFromPayload(source, row.payload),
            summaryFallback: taglineFromPayload(row.payload) || row.title,
          },
          classification,
          db,
        );
        accepted += 1;
      } else {
        rejected += 1;
      }

      await db
        .update(candidates)
        .set({
          decision: accept ? "accepted" : "rejected",
          classification,
          confidence: classification.confidence,
          processedAt: new Date(),
        })
        .where(eq(candidates.id, row.id));

      await new Promise((r) => setTimeout(r, 7_000));
    } catch (err) {
      console.error("classify failed", source, row.externalId, err);
      const message = err instanceof Error ? err.message : String(err);
      // Daily free-tier exhaustion — stop the batch so callers can pause.
      if (/quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(message)) {
        return {
          processed: accepted + rejected,
          accepted,
          rejected,
          quotaHit: true as const,
        };
      }
      if (/429|rate/i.test(message)) {
        await new Promise((r) => setTimeout(r, 45_000));
      }
    }
  }

  return { processed: pending.length, accepted, rejected };
}

export async function getCursor(stream: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select()
    .from(ingestionCursors)
    .where(eq(ingestionCursors.stream, stream))
    .limit(1);
  if (rows[0]) return rows[0].untilTs;
  const now = Math.floor(Date.now() / 1000);
  await db.insert(ingestionCursors).values({ stream, untilTs: now });
  return now;
}

export async function setCursor(
  stream: string,
  untilTs: number,
  lastObjectId?: string,
) {
  const db = getDb();
  await db
    .insert(ingestionCursors)
    .values({
      stream,
      untilTs,
      lastObjectId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: ingestionCursors.stream,
      set: {
        untilTs,
        lastObjectId,
        updatedAt: new Date(),
      },
    });
}

export async function getIngestionStatus() {
  const db = getDb();
  const cursors = await db.select().from(ingestionCursors);
  const counts = await db
    .select({
      decision: candidates.decision,
      count: sql<number>`count(*)::int`,
    })
    .from(candidates)
    .groupBy(candidates.decision);
  const bySource = await db
    .select({
      source: candidates.source,
      count: sql<number>`count(*)::int`,
    })
    .from(candidates)
    .groupBy(candidates.source);
  const toolCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tools)
    .where(and(eq(tools.status, "published")));

  return {
    cursors,
    candidates: counts,
    candidatesBySource: bySource,
    tools: toolCount[0]?.count ?? 0,
  };
}
