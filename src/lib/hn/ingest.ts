import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import {
  getCursor,
  getIngestionStatus,
  processPendingCandidates,
  setCursor,
} from "@/lib/ingest/process";
import { pollDevHunt } from "@/lib/devhunt/ingest";
import { pollLobsters } from "@/lib/lobsters/ingest";
import { pollProductHunt } from "@/lib/producthunt/ingest";
import { pollUneed } from "@/lib/uneed/ingest";
import {
  fetchNewestShowHn,
  fetchNewestStories,
  iterateTimeSlices,
  isShowHn,
  looksLikeToolPost,
  type HnHit,
} from "@/lib/hn/algolia";

const HN_EPOCH = 1_176_000_000; // ~2007

async function upsertCandidate(hit: HnHit, sourceStream: string) {
  const db = getDb();
  const show = isShowHn(hit);
  await db
    .insert(candidates)
    .values({
      source: "hackernews",
      externalId: hit.objectID,
      title: hit.title ?? "",
      url: hit.url,
      author: hit.author,
      points: hit.points ?? 0,
      numComments: hit.num_comments ?? 0,
      createdAt: new Date((hit.created_at_i || 0) * 1000),
      isShowHn: show,
      sourceStream,
      payload: hit,
      decision: "pending",
    })
    .onConflictDoNothing({
      target: [candidates.source, candidates.externalId],
    });
}

export { processPendingCandidates, getIngestionStatus };

export async function pollHn(): Promise<{ inserted: number }> {
  const db = getDb();
  const show = await fetchNewestShowHn(60);
  const stories = await fetchNewestStories(80);
  const merged = new Map<string, HnHit>();
  for (const h of show) merged.set(h.objectID, h);
  for (const h of stories) {
    if (looksLikeToolPost(h)) merged.set(h.objectID, h);
  }

  let inserted = 0;
  for (const hit of merged.values()) {
    const before = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(
        and(
          eq(candidates.source, "hackernews"),
          eq(candidates.externalId, hit.objectID),
        ),
      )
      .limit(1);
    if (before.length) continue;
    await upsertCandidate(
      hit,
      isShowHn(hit) ? "poll_show_hn" : "poll_story",
    );
    inserted += 1;
  }

  return { inserted };
}

/** Poll HN + launch boards, then classify a small free-tier batch. */
export async function pollLatest(): Promise<{
  hn: { inserted: number };
  producthunt: Awaited<ReturnType<typeof pollProductHunt>>;
  lobsters: { inserted: number; fetched: number; error?: string };
  uneed: { inserted: number; fetched: number; error?: string };
  devhunt: { inserted: number; fetched: number; error?: string };
  classified: Awaited<ReturnType<typeof processPendingCandidates>>;
}> {
  const hn = await pollHn();
  let producthunt: Awaited<ReturnType<typeof pollProductHunt>>;
  try {
    producthunt = await pollProductHunt({ classify: false });
  } catch (err) {
    console.error("Product Hunt poll failed", err);
    producthunt = {
      mode: "atom",
      skipped: err instanceof Error ? err.message : "Product Hunt poll failed",
      inserted: 0,
      fetched: 0,
    };
  }

  let lobsters: { inserted: number; fetched: number; error?: string };
  try {
    lobsters = await pollLobsters();
  } catch (err) {
    console.error("Lobsters poll failed", err);
    lobsters = {
      inserted: 0,
      fetched: 0,
      error: err instanceof Error ? err.message : "Lobsters poll failed",
    };
  }

  let uneed: { inserted: number; fetched: number; error?: string };
  try {
    uneed = await pollUneed();
  } catch (err) {
    console.error("Uneed poll failed", err);
    uneed = {
      inserted: 0,
      fetched: 0,
      error: err instanceof Error ? err.message : "Uneed poll failed",
    };
  }

  let devhunt: { inserted: number; fetched: number; error?: string };
  try {
    devhunt = await pollDevHunt({ limit: 20 });
  } catch (err) {
    console.error("DevHunt poll failed", err);
    devhunt = {
      inserted: 0,
      fetched: 0,
      error: err instanceof Error ? err.message : "DevHunt poll failed",
    };
  }

  const classified = await processPendingCandidates({ limit: 8 });
  return { hn, producthunt, lobsters, uneed, devhunt, classified };
}

export async function backfillShowHn(options?: {
  maxHits?: number;
  classifyBatch?: number;
}): Promise<{ fetched: number; cursor: number }> {
  const stream = "show_hn";
  const maxHits = options?.maxHits ?? 200;
  let until = await getCursor(stream);
  let fetched = 0;
  let lastId: string | undefined;

  for await (const hit of iterateTimeSlices({
    tags: "show_hn",
    startBefore: until,
    stopAfter: HN_EPOCH,
    windowSeconds: 60 * 60 * 24 * 7,
  })) {
    await upsertCandidate(hit, stream);
    fetched += 1;
    lastId = hit.objectID;
    until = hit.created_at_i;
    if (fetched >= maxHits) break;
  }

  await setCursor(stream, until, lastId);
  await processPendingCandidates({
    limit: options?.classifyBatch ?? 15,
  });
  return { fetched, cursor: until };
}

export async function backfillToolLikeStories(options?: {
  maxHits?: number;
  classifyBatch?: number;
}): Promise<{ fetched: number; cursor: number }> {
  const stream = "tool_like_stories";
  const maxHits = options?.maxHits ?? 150;
  let until = await getCursor(stream);
  let fetched = 0;
  let lastId: string | undefined;

  const queries = ["I built", "CLI", "open source tool", "SDK"];

  for (const query of queries) {
    if (fetched >= maxHits) break;
    for await (const hit of iterateTimeSlices({
      tags: "story",
      query,
      startBefore: until,
      stopAfter: HN_EPOCH,
      windowSeconds: 60 * 60 * 24 * 30,
    })) {
      if (!looksLikeToolPost(hit)) continue;
      if (isShowHn(hit)) continue;
      await upsertCandidate(hit, stream);
      fetched += 1;
      lastId = hit.objectID;
      until = Math.min(until, hit.created_at_i);
      if (fetched >= maxHits) break;
    }
  }

  await setCursor(stream, until, lastId);
  await processPendingCandidates({
    limit: options?.classifyBatch ?? 15,
  });
  return { fetched, cursor: until };
}
