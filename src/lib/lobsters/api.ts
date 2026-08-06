export type LobstersStory = {
  short_id: string;
  title: string;
  url: string | null;
  score: number;
  comment_count: number;
  created_at: string;
  submitter_user: string;
  tags: string[];
  comments_url: string;
};

const BASE = "https://lobste.rs";

async function fetchFeed(path: string): Promise<LobstersStory[]> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ToolshelfBot/1.0 (+https://toolshelf.space)",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Lobsters ${res.status}: ${path}`);
  }
  return (await res.json()) as LobstersStory[];
}

export async function fetchNewestStories(): Promise<LobstersStory[]> {
  return fetchFeed("/newest.json");
}

export async function fetchHottestStories(): Promise<LobstersStory[]> {
  return fetchFeed("/hottest.json");
}

/** Dedicated show tag feed — best signal for product launches */
export async function fetchShowStories(): Promise<LobstersStory[]> {
  return fetchFeed("/t/show.json");
}

/** Prefer show / tooling tags; keep URL'd posts that look product-like. */
export function looksLikeToolStory(story: LobstersStory): boolean {
  if (!story.url?.trim()) return false;
  const tags = new Set(story.tags.map((t) => t.toLowerCase()));
  if (tags.has("show") || tags.has("release")) return true;
  if (
    tags.has("programming") ||
    tags.has("web") ||
    tags.has("devops") ||
    tags.has("compsci") ||
    tags.has("ai") ||
    tags.has("python") ||
    tags.has("rust") ||
    tags.has("go") ||
    tags.has("javascript")
  ) {
    return /\b(cli|sdk|api|tool|library|framework|app|plugin|extension|dashboard|open.?source|i built|we built|launch)\b/i.test(
      story.title,
    );
  }
  return /\b(show\b|cli|sdk|open.?source tool)\b/i.test(story.title);
}
