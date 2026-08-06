import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { getDb } from "./index";
import {
  candidates,
  ingestionCursors,
  sourceMentions,
  tools,
  type Source,
  type SourceMention,
  type Tool,
} from "./schema";
import { findRedditMentionsForTool } from "@/lib/reddit/api";
import { findUneedListingForTool } from "@/lib/uneed/directory";
import {
  hostnameFromUrl,
  isAggregatorHost,
  normalizeUrl,
  slugify,
  stripShowHnPrefix,
} from "@/lib/utils";

export type MentionView = {
  key: string;
  source: string;
  title: string;
  score: number;
  numComments: number;
  createdAt: Date;
  permalink: string | null;
  externalId: string;
  href: string;
};

function namesMatch(toolName: string, title: string): boolean {
  const a = slugify(toolName);
  const b = slugify(stripShowHnPrefix(title));
  if (!a || a.length < 3 || !b) return false;
  if (a === b) return true;
  if (b.includes(a) && a.length >= 4) return true;
  if (a.includes(b) && b.length >= 4) return true;
  return false;
}

function candidateWebsite(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { website?: unknown; phUrl?: unknown };
  if (typeof p.website === "string" && p.website.trim()) return p.website;
  return null;
}

function classifiedUrl(classification: unknown): string | null {
  if (!classification || typeof classification !== "object") return null;
  const c = classification as { url?: unknown };
  return typeof c.url === "string" ? c.url : null;
}

function mentionsSameProduct(
  tool: Tool,
  input: { title: string; url: string | null; payload?: unknown; classification?: unknown },
): boolean {
  const toolNorm = normalizeUrl(tool.url);
  const urls = [
    input.url,
    candidateWebsite(input.payload),
    classifiedUrl(input.classification),
  ]
    .map((u) => (u ? normalizeUrl(u) : null))
    .filter(Boolean) as string[];

  if (toolNorm && urls.includes(toolNorm)) return true;

  const toolHost = hostnameFromUrl(tool.url);
  if (toolHost && !isAggregatorHost(toolHost)) {
    for (const u of urls) {
      const h = hostnameFromUrl(u);
      if (h && h === toolHost) return true;
    }
  }

  return namesMatch(tool.name, input.title);
}

function permalinkFor(
  source: string,
  externalId: string,
  permalink: string | null,
  payload?: unknown,
): string {
  if (permalink) return permalink;
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
    if (permalink) return permalink;
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
  return `https://news.ycombinator.com/item?id=${externalId}`;
}

function toView(m: SourceMention, payload?: unknown): MentionView {
  const href = permalinkFor(m.source, m.externalId, m.permalink, payload);
  return {
    key: `${m.source}:${m.externalId}`,
    source: m.source,
    title: m.title,
    score: m.score,
    numComments: m.numComments,
    createdAt: m.createdAt,
    permalink: m.permalink,
    externalId: m.externalId,
    href,
  };
}

/** Attach matching launches from other sources onto this tool. */
export async function ensureCrossSourceMentions(tool: Tool): Promise<void> {
  const db = getDb();
  const nameNeedle = `%${tool.name}%`;

  const [
    relatedCandidates,
    otherMentions,
    existingReddit,
    existingUneed,
    redditCursor,
    uneedCursor,
  ] = await Promise.all([
    db
      .select()
      .from(candidates)
      .where(
        and(
          eq(candidates.decision, "accepted"),
          or(
            tool.url ? eq(candidates.url, tool.url) : sql`false`,
            ilike(candidates.title, tool.name),
            ilike(candidates.title, nameNeedle),
          ),
        ),
      )
      .limit(40),
    db
      .select()
      .from(sourceMentions)
      .where(
        and(
          ne(sourceMentions.toolId, tool.id),
          or(
            tool.url ? eq(sourceMentions.url, tool.url) : sql`false`,
            ilike(sourceMentions.title, tool.name),
            ilike(sourceMentions.title, nameNeedle),
          ),
        ),
      )
      .limit(40),
    db
      .select({ id: sourceMentions.id })
      .from(sourceMentions)
      .where(
        and(
          eq(sourceMentions.toolId, tool.id),
          eq(sourceMentions.source, "reddit"),
        ),
      )
      .limit(1),
    db
      .select({ id: sourceMentions.id })
      .from(sourceMentions)
      .where(
        and(
          eq(sourceMentions.toolId, tool.id),
          eq(sourceMentions.source, "uneed"),
        ),
      )
      .limit(1),
    db
      .select()
      .from(ingestionCursors)
      .where(eq(ingestionCursors.stream, `reddit-lookup:${tool.id}`))
      .limit(1),
    db
      .select()
      .from(ingestionCursors)
      .where(eq(ingestionCursors.stream, `uneed-lookup:${tool.id}`))
      .limit(1),
  ]);

  const matches = relatedCandidates.filter((c) =>
    mentionsSameProduct(tool, {
      title: c.title,
      url: c.url,
      payload: c.payload,
      classification: c.classification,
    }),
  );

  const linkedSources = new Set(tool.sources ?? []);

  for (const c of matches) {
    const source = c.source as Source;
    const href = permalinkFor(source, c.externalId, null, c.payload);
    await db
      .insert(sourceMentions)
      .values({
        toolId: tool.id,
        source,
        externalId: c.externalId,
        title: c.title,
        url: c.url,
        permalink: href,
        score: c.points,
        numComments: c.numComments,
        createdAt: c.createdAt,
        isShowHn: c.isShowHn,
      })
      .onConflictDoNothing({
        target: [sourceMentions.source, sourceMentions.externalId],
      });

    await db
      .update(sourceMentions)
      .set({ toolId: tool.id, permalink: href })
      .where(
        and(
          eq(sourceMentions.source, source),
          eq(sourceMentions.externalId, c.externalId),
          ne(sourceMentions.toolId, tool.id),
        ),
      );

    linkedSources.add(source);
  }

  for (const m of otherMentions) {
    if (
      !mentionsSameProduct(tool, {
        title: m.title,
        url: m.url,
      })
    ) {
      continue;
    }
    await db
      .update(sourceMentions)
      .set({ toolId: tool.id })
      .where(eq(sourceMentions.id, m.id));
    linkedSources.add(m.source);
  }

  const weekSecs = 7 * 24 * 60 * 60;
  const nowSecs = Math.floor(Date.now() / 1000);

  if (existingReddit.length > 0) {
    linkedSources.add("reddit");
  } else {
    const stale =
      !redditCursor[0] || nowSecs - redditCursor[0].untilTs > weekSecs;

    if (stale) {
      try {
        const redditHits = await findRedditMentionsForTool(tool);
        for (const post of redditHits.slice(0, 12)) {
          await db
            .insert(sourceMentions)
            .values({
              toolId: tool.id,
              source: "reddit",
              externalId: post.id,
              title: post.title,
              url: post.url,
              permalink: post.permalink,
              score: post.score,
              numComments: post.numComments,
              createdAt: post.createdAt,
              isShowHn: false,
            })
            .onConflictDoNothing({
              target: [sourceMentions.source, sourceMentions.externalId],
            });
          linkedSources.add("reddit");
        }
      } catch (err) {
        console.error("Reddit cross-source lookup failed", tool.slug, err);
      }

      await db
        .insert(ingestionCursors)
        .values({
          stream: `reddit-lookup:${tool.id}`,
          untilTs: nowSecs,
          lastObjectId: tool.slug,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: ingestionCursors.stream,
          set: {
            untilTs: nowSecs,
            lastObjectId: tool.slug,
            updatedAt: new Date(),
          },
        });
    }
  }

  if (existingUneed.length > 0) {
    linkedSources.add("uneed");
  } else {
    const stale =
      !uneedCursor[0] || nowSecs - uneedCursor[0].untilTs > weekSecs;

    if (stale) {
      try {
        const listing = await findUneedListingForTool(tool);
        if (listing) {
          await db
            .insert(sourceMentions)
            .values({
              toolId: tool.id,
              source: "uneed",
              externalId: listing.slug,
              title: listing.name,
              url: listing.url,
              permalink: listing.uneed_url,
              score: listing.vote_value_sum ?? listing.vote_count ?? 0,
              numComments: 0,
              createdAt: listing.launch_date
                ? new Date(`${listing.launch_date}T12:00:00.000Z`)
                : new Date(),
              isShowHn: false,
            })
            .onConflictDoNothing({
              target: [sourceMentions.source, sourceMentions.externalId],
            });
          linkedSources.add("uneed");
        }
      } catch (err) {
        console.error("Uneed directory lookup failed", tool.slug, err);
      }

      await db
        .insert(ingestionCursors)
        .values({
          stream: `uneed-lookup:${tool.id}`,
          untilTs: nowSecs,
          lastObjectId: tool.slug,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: ingestionCursors.stream,
          set: {
            untilTs: nowSecs,
            lastObjectId: tool.slug,
            updatedAt: new Date(),
          },
        });
    }
  }

  const nextSources = Array.from(linkedSources);
  if (
    nextSources.length !== (tool.sources?.length ?? 0) ||
    nextSources.some((s) => !(tool.sources ?? []).includes(s))
  ) {
    await db
      .update(tools)
      .set({ sources: nextSources, updatedAt: new Date() })
      .where(eq(tools.id, tool.id));
  }
}

/** Read mentions already linked to the tool (call ensureCrossSourceMentions first). */
export async function listMentionViews(toolId: number): Promise<MentionView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(sourceMentions)
    .where(eq(sourceMentions.toolId, toolId))
    .orderBy(desc(sourceMentions.score), desc(sourceMentions.createdAt));

  const byKey = new Map<string, MentionView>();
  for (const row of rows) {
    const view = toView(row);
    const prev = byKey.get(view.key);
    if (!prev || view.score > prev.score) byKey.set(view.key, view);
  }

  return [...byKey.values()].sort(
    (a, b) =>
      b.score - a.score ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function getCrossSourceMentions(tool: Tool): Promise<MentionView[]> {
  // Fast path: only read stored mentions. Enrichment (cross-source + Reddit)
  // runs after the response via the detail page `after()` hook.
  return listMentionViews(tool.id);
}
