import { eq } from "drizzle-orm";
import type { Classification } from "@/lib/ai/classify";
import { getDb, type Db } from "@/lib/db";
import { sourceMentions, tools, type Source } from "@/lib/db/schema";
import { preferScenePreview } from "@/lib/enrich/media";
import { enrichToolVisuals } from "@/lib/enrich/preview";
import {
  isAggregatorUrl,
  normalizeUrl,
  resolveWebsiteUrl,
  slugify,
} from "@/lib/utils";

export type AcceptInput = {
  source: Source;
  externalId: string;
  title: string;
  url: string | null;
  score: number;
  numComments: number;
  createdAt: Date;
  permalink: string | null;
  isShowHn?: boolean;
  /** Prefer this over scraping when the source already has a good image */
  previewImageUrl?: string | null;
  summaryFallback?: string;
};

async function ensureUniqueSlug(db: Db, base: string): Promise<string> {
  const slug = slugify(base) || "tool";
  let n = 0;
  while (true) {
    const trySlug = n === 0 ? slug : `${slug}-${n}`;
    const existing = await db
      .select({ id: tools.id })
      .from(tools)
      .where(eq(tools.slug, trySlug))
      .limit(1);
    if (!existing.length) return trySlug;
    n += 1;
  }
}

/** Upsert a tool by canonical URL and attach a source mention. */
export async function acceptTool(
  input: AcceptInput,
  classification: Classification,
  db: Db = getDb(),
): Promise<number | null> {
  const candidates = [
    normalizeUrl(classification.url || ""),
    normalizeUrl(input.url || ""),
  ].filter((u): u is string => Boolean(u));

  let url =
    candidates.find((u) => !isAggregatorUrl(u)) ?? candidates[0] ?? null;

  if (url && isAggregatorUrl(url)) {
    url = (await resolveWebsiteUrl(url)) || url;
  }

  if (!url || isAggregatorUrl(url) || !classification.name) return null;

  const existing = await db
    .select()
    .from(tools)
    .where(eq(tools.url, url))
    .limit(1);

  let toolId: number;
  const score = input.score;
  const comments = input.numComments;
  const seenAt = input.createdAt;

  const mergedSources = Array.from(
    new Set([...(existing[0]?.sources ?? []), input.source]),
  );

  const reason =
    classification.reason?.trim().slice(0, 280) || null;

  if (existing[0]) {
    toolId = existing[0].id;
    await db
      .update(tools)
      .set({
        scorePeak: Math.max(existing[0].scorePeak, score),
        commentsPeak: Math.max(existing[0].commentsPeak, comments),
        firstSeenAt:
          seenAt < existing[0].firstSeenAt ? seenAt : existing[0].firstSeenAt,
        sources: mergedSources,
        previewImageUrl: preferScenePreview(
          existing[0].previewImageUrl,
          input.previewImageUrl,
        ),
        inclusionReason: existing[0].inclusionReason ?? reason,
        updatedAt: new Date(),
      })
      .where(eq(tools.id, toolId));
  } else {
    const visuals = await enrichToolVisuals(url);
    const slug = await ensureUniqueSlug(db, classification.name);
    const resolvedPricing =
      visuals.detectedPricing ??
      (classification.pricing !== "unknown" ? classification.pricing : "unknown");

    let inserted: Array<{ id: number }> = [];
    try {
      inserted = await db
        .insert(tools)
        .values({
          slug,
          name: classification.name,
          url,
          summary:
            classification.one_line_summary ||
            input.summaryFallback ||
            classification.name,
          categories: classification.categories,
          sources: [input.source],
          pricing: resolvedPricing,
          logoUrl: visuals.logoUrl,
          previewImageUrl: preferScenePreview(
            input.previewImageUrl,
            visuals.previewImageUrl,
          ),
          brandColor: visuals.brandColor,
          features: classification.features ?? [],
          inclusionReason: reason,
          firstSeenAt: seenAt,
          scorePeak: score,
          commentsPeak: comments,
          status: "published",
        })
        .returning({ id: tools.id });
    } catch {
      const altSlug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      inserted = await db
        .insert(tools)
        .values({
          slug: altSlug,
          name: classification.name,
          url,
          summary:
            classification.one_line_summary ||
            input.summaryFallback ||
            classification.name,
          categories: classification.categories,
          sources: [input.source],
          pricing: resolvedPricing,
          logoUrl: visuals.logoUrl,
          previewImageUrl: preferScenePreview(
            input.previewImageUrl,
            visuals.previewImageUrl,
          ),
          brandColor: visuals.brandColor,
          features: classification.features ?? [],
          inclusionReason: reason,
          firstSeenAt: seenAt,
          scorePeak: score,
          commentsPeak: comments,
          status: "published",
        })
        .returning({ id: tools.id });
    }
    toolId = inserted[0]!.id;
  }

  await db
    .insert(sourceMentions)
    .values({
      toolId,
      source: input.source,
      externalId: input.externalId,
      title: input.title,
      url: input.url,
      permalink: input.permalink,
      score,
      numComments: comments,
      createdAt: seenAt,
      isShowHn: Boolean(input.isShowHn),
    })
    .onConflictDoNothing({
      target: [sourceMentions.source, sourceMentions.externalId],
    });

  return toolId;
}
