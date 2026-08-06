import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { processPendingCandidates } from "@/lib/ingest/process";
import {
  fetchNewestPosts,
  hasProductHuntToken,
  productUrl,
  type PhPost,
} from "./api";
import { fetchPostsFromAtom } from "./atom";
import { resolveWebsiteUrl } from "@/lib/utils";

async function resolvePhWebsite(post: PhPost): Promise<string | null> {
  const direct = productUrl(post);
  if (direct) return direct;
  // Atom/GraphQL sometimes only give a PH /r/ redirect — follow it once.
  const redirect =
    post.website?.includes("producthunt.com/r/")
      ? post.website
      : post.url.includes("producthunt.com/r/")
        ? post.url
        : null;
  if (!redirect) return null;
  return resolveWebsiteUrl(redirect);
}

async function upsertPhCandidate(post: PhPost, stream: string) {
  const db = getDb();
  const website = await resolvePhWebsite(post);
  if (!website) return false;

  await db
    .insert(candidates)
    .values({
      source: "producthunt",
      externalId: post.id,
      title: post.name,
      url: website,
      author: null,
      points: post.votesCount,
      numComments: post.commentsCount,
      createdAt: new Date(post.createdAt),
      isShowHn: false,
      sourceStream: stream,
      payload: {
        slug: post.slug,
        tagline: post.tagline,
        phUrl: post.url,
        website,
        thumbnailUrl: post.thumbnailUrl,
        previewImageUrl: post.previewImageUrl,
        topics: post.topics,
        via: stream,
      },
      decision: "pending",
    })
    .onConflictDoNothing({
      target: [candidates.source, candidates.externalId],
    });
  return true;
}

export async function pollProductHunt(options?: {
  first?: number;
  classify?: boolean;
}): Promise<{
  mode: "graphql" | "atom";
  skipped?: string;
  inserted: number;
  fetched: number;
  classified?: Awaited<ReturnType<typeof processPendingCandidates>>;
}> {
  const db = getDb();
  const useGraphql = hasProductHuntToken();
  const mode = useGraphql ? "graphql" : "atom";

  let posts: PhPost[];
  try {
    posts = useGraphql
      ? await fetchNewestPosts(options?.first ?? 30)
      : await fetchPostsFromAtom();
  } catch (err) {
    return {
      mode,
      skipped: err instanceof Error ? err.message : "Product Hunt fetch failed",
      inserted: 0,
      fetched: 0,
    };
  }

  if (options?.first && posts.length > options.first) {
    posts = posts.slice(0, options.first);
  }

  const stream = useGraphql ? "poll_producthunt" : "poll_producthunt_atom";
  let inserted = 0;

  for (const post of posts) {
    const before = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(
        and(
          eq(candidates.source, "producthunt"),
          eq(candidates.externalId, post.id),
        ),
      )
      .limit(1);
    if (before.length) continue;
    const ok = await upsertPhCandidate(post, stream);
    if (ok) inserted += 1;
  }

  const classified =
    options?.classify === false
      ? undefined
      : await processPendingCandidates({ limit: 6 });

  return { mode, inserted, fetched: posts.length, classified };
}
