import { hostnameFromUrl, normalizeUrl } from "@/lib/utils";
import type { Tool } from "@/lib/db/schema";

export type RedditPost = {
  id: string;
  title: string;
  url: string | null;
  permalink: string;
  score: number;
  numComments: number;
  createdAt: Date;
  subreddit: string;
};

type ArcticPost = {
  id?: string;
  name?: string;
  title?: string;
  url?: string;
  permalink?: string;
  score?: number;
  ups?: number;
  num_comments?: number;
  created_utc?: number;
  subreddit?: string;
  over_18?: boolean;
};

type ArcticResponse = {
  data?: ArcticPost[] | null;
  error?: string;
};

const UA = "ToolshelfBot/1.0 (+https://toolshelf.space; product directory)";

/**
 * Reddit's public .json endpoints return 403 without app OAuth.
 * Arctic Shift indexes link posts and supports exact URL search for free.
 * https://arctic-shift.photon-reddit.com
 */
async function searchArcticByUrl(
  linkUrl: string,
  limit = 25,
): Promise<RedditPost[]> {
  // API requires url length 14–500
  let urlParam = linkUrl.trim();
  if (urlParam.length < 14) {
    urlParam = urlParam.startsWith("http") ? urlParam : `https://${urlParam}`;
  }
  if (urlParam.length < 14) {
    urlParam = `${urlParam}/`;
  }

  const sp = new URLSearchParams({
    url: urlParam,
    limit: String(Math.min(Math.max(limit, 1), 100)),
    sort: "desc",
    sort_type: "created_utc",
  });

  const res = await fetch(
    `https://arctic-shift.photon-reddit.com/api/posts/search?${sp}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (!res.ok) {
    throw new Error(`Arctic Shift search ${res.status}`);
  }

  const json = (await res.json()) as ArcticResponse;
  if (json.error) {
    throw new Error(`Arctic Shift: ${json.error}`);
  }

  const rows = json.data ?? [];
  return rows
    .map((d) => {
      if (!d?.id || !d.title || !d.permalink) return null;
      if (d.over_18) return null;
      const permalink = d.permalink.startsWith("http")
        ? d.permalink
        : `https://www.reddit.com${d.permalink}`;
      return {
        id: d.name || `t3_${d.id}`,
        title: d.title,
        url: d.url ?? null,
        permalink,
        score: d.score ?? d.ups ?? 0,
        numComments: d.num_comments ?? 0,
        createdAt: new Date((d.created_utc ?? 0) * 1000),
        subreddit: d.subreddit ?? "",
      } satisfies RedditPost;
    })
    .filter((p): p is RedditPost => Boolean(p));
}

function postMatchesTool(tool: Tool, post: RedditPost): boolean {
  const toolNorm = normalizeUrl(tool.url);
  const toolHost = hostnameFromUrl(tool.url);
  if (!toolHost) return false;

  const postNorm = post.url ? normalizeUrl(post.url) : null;
  const postHost = post.url ? hostnameFromUrl(post.url) : "";

  if (toolNorm && postNorm && toolNorm === postNorm) return true;
  if (!post.url || postHost !== toolHost) return false;

  try {
    const toolPath = new URL(tool.url).pathname.replace(/\/+$/, "");
    const postPath = new URL(post.url).pathname.replace(/\/+$/, "");

    // A deep product URL must match its own path, not any page on the domain.
    if (toolPath) {
      return postPath === toolPath || postPath.startsWith(`${toolPath}/`);
    }

    // Root domains are broad (for example, rippling.com). Require the Reddit
    // title to name the product so company ads and unrelated resources stay out.
    const generic = new Set([
      "with",
      "from",
      "your",
      "that",
      "this",
      "tool",
      "app",
      "product",
      "platform",
    ]);
    const tokens =
      tool.name
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter((word) => word.length >= 4 && !generic.has(word)) ?? [];
    const title = post.title.toLowerCase();
    return tokens.some((token) => title.includes(token));
  } catch {
    return false;
  }
}

function searchUrlsForTool(tool: Tool): string[] {
  const host = hostnameFromUrl(tool.url);
  if (!host) return [];

  const bare = host.startsWith("www.") ? host.slice(4) : host;
  const normalized = normalizeUrl(tool.url);
  // One query keeps detail enrichment cheap; host root catches most link posts
  const primary = normalized || `https://${bare}/`;
  return [primary.length >= 14 ? primary : `https://${bare}/`];
}

/** Find Reddit threads that link to this tool's site. No API key required. */
export async function findRedditMentionsForTool(
  tool: Tool,
): Promise<RedditPost[]> {
  const host = hostnameFromUrl(tool.url);
  if (!host || host.includes("reddit.com")) return [];

  const merged = new Map<string, RedditPost>();
  const [q] = searchUrlsForTool(tool);
  if (!q) return [];

  try {
    const posts = await searchArcticByUrl(q, 40);
    for (const post of posts) {
      if (!postMatchesTool(tool, post)) continue;
      const prev = merged.get(post.id);
      if (!prev || post.score > prev.score) merged.set(post.id, post);
    }
  } catch (err) {
    console.error("Reddit search failed", q, err);
  }

  return [...merged.values()].sort((a, b) => b.score - a.score);
}
