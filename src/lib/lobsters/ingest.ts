import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import {
  fetchHottestStories,
  fetchNewestStories,
  fetchShowStories,
  looksLikeToolStory,
  type LobstersStory,
} from "./api";

async function upsertStory(story: LobstersStory) {
  const db = getDb();
  await db
    .insert(candidates)
    .values({
      source: "lobsters",
      externalId: story.short_id,
      title: story.title,
      url: story.url,
      author: story.submitter_user,
      points: story.score,
      numComments: story.comment_count,
      createdAt: new Date(story.created_at),
      isShowHn: story.tags.includes("show"),
      sourceStream: "poll_lobsters",
      payload: {
        tags: story.tags,
        commentsUrl: story.comments_url,
        tagline: null,
      },
      decision: "pending",
    })
    .onConflictDoNothing({
      target: [candidates.source, candidates.externalId],
    });
}

export async function pollLobsters(): Promise<{
  inserted: number;
  fetched: number;
}> {
  const db = getDb();
  const [newest, hottest, show] = await Promise.all([
    fetchNewestStories(),
    fetchHottestStories(),
    fetchShowStories(),
  ]);
  const merged = new Map<string, LobstersStory>();
  for (const s of show) {
    if (s.url?.trim()) merged.set(s.short_id, s);
  }
  for (const s of [...newest, ...hottest]) {
    if (looksLikeToolStory(s)) merged.set(s.short_id, s);
  }

  let inserted = 0;
  for (const story of merged.values()) {
    const before = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(
        and(
          eq(candidates.source, "lobsters"),
          eq(candidates.externalId, story.short_id),
        ),
      )
      .limit(1);
    if (before.length) continue;
    await upsertStory(story);
    inserted += 1;
  }

  return { inserted, fetched: merged.size };
}
