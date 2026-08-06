import type { PhPost } from "./api";

/**
 * Public Atom feeds — no developer token.
 * https://www.producthunt.com/feed?category=...
 */
const FEEDS = [
  "https://www.producthunt.com/feed?category=developer-tools",
  "https://www.producthunt.com/feed?category=productivity",
  "https://www.producthunt.com/feed?category=artificial-intelligence",
  "https://www.producthunt.com/feed?category=saas",
  "https://www.producthunt.com/feed?category=design-tools",
];

function decodeBasicEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripTags(html: string): string {
  return decodeBasicEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function tagText(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m?.[1] ? stripTags(m[1]) : "";
}

function linkHref(block: string): string | null {
  const alt = block.match(
    /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i,
  );
  if (alt?.[1]) return decodeBasicEntities(alt[1]);
  const any = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return any?.[1] ? decodeBasicEntities(any[1]) : null;
}

function slugFromPhUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const parts = path.split("/").filter(Boolean);
    return parts[parts.length - 1] || url;
  } catch {
    return url;
  }
}

function parseEntry(
  block: string,
  rank: number,
  topic: string,
): PhPost | null {
  const idRaw = tagText(block, "id");
  const idMatch = idRaw.match(/Post\/(\d+)/i);
  if (!idMatch) return null;

  const id = idMatch[1]!;
  const name = tagText(block, "title");
  if (!name) return null;

  const phUrl =
    linkHref(block) || `https://www.producthunt.com/posts/${id}`;

  const contentInner =
    block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] ?? "";
  const contentHtml = decodeBasicEntities(contentInner);
  const contentText = stripTags(contentHtml);
  const tagline = contentText
    .replace(/\bDiscussion\b.*$/i, "")
    .replace(/\|\s*Link\b.*$/i, "")
    .trim();

  // Atom only exposes PH /r/ redirectors, not the maker site. Leave website
  // null so ingest does not store producthunt.com as the product URL.
  const website = null;

  const published =
    tagText(block, "published") ||
    tagText(block, "updated") ||
    new Date().toISOString();

  // Feed is ranked; Atom has no structured votes. Approximate from rank.
  const votesCount = Math.max(1, 80 - rank * 3);

  return {
    id,
    slug: slugFromPhUrl(phUrl),
    name,
    tagline: tagline.slice(0, 160),
    url: phUrl,
    website,
    votesCount,
    commentsCount: 0,
    createdAt: new Date(published).toISOString(),
    thumbnailUrl: null,
    previewImageUrl: null,
    topics: topic ? [topic] : [],
  };
}

async function fetchFeed(url: string): Promise<PhPost[]> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/atom+xml, application/xml, text/xml, */*",
      "User-Agent": "ToolshelfBot/1.0 (+https://toolshelf.space; product directory)",
    },
    cache: "no-store",
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Product Hunt Atom ${res.status}: ${url}`);
  }

  const xml = await res.text();
  const topic =
    new URL(url).searchParams.get("category") ||
    new URL(url).searchParams.get("tag") ||
    "producthunt";

  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
  return entries
    .map((block, index) => parseEntry(block, index, topic))
    .filter((p): p is PhPost => Boolean(p));
}

/** Newest / ranked launches from public Atom feeds (no token). */
export async function fetchPostsFromAtom(): Promise<PhPost[]> {
  const merged = new Map<string, PhPost>();

  for (const feed of FEEDS) {
    try {
      const posts = await fetchFeed(feed);
      for (const post of posts) {
        const prev = merged.get(post.id);
        if (!prev) {
          merged.set(post.id, post);
          continue;
        }
        merged.set(post.id, {
          ...prev,
          votesCount: Math.max(prev.votesCount, post.votesCount),
          topics: Array.from(new Set([...prev.topics, ...post.topics])),
          website: prev.website || post.website,
          tagline: prev.tagline || post.tagline,
        });
      }
    } catch (err) {
      console.error("PH Atom feed failed", feed, err);
    }
  }

  return [...merged.values()].sort(
    (a, b) =>
      b.votesCount - a.votesCount ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
