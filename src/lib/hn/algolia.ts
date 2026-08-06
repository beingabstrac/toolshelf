export type HnHit = {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string | null;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
  _tags?: string[];
};

type AlgoliaResponse = {
  hits: HnHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
};

const BASE = "https://hn.algolia.com/api/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`HN Algolia ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

export function isShowHn(hit: HnHit): boolean {
  return Boolean(hit._tags?.includes("show_hn"));
}

export async function searchByDate(params: {
  tags?: string;
  query?: string;
  page?: number;
  hitsPerPage?: number;
  createdAfter?: number;
  createdBefore?: number;
}): Promise<AlgoliaResponse> {
  const sp = new URLSearchParams();
  if (params.tags) sp.set("tags", params.tags);
  if (params.query) sp.set("query", params.query);
  sp.set("page", String(params.page ?? 0));
  sp.set("hitsPerPage", String(params.hitsPerPage ?? 100));

  const filters: string[] = [];
  if (params.createdAfter != null) {
    filters.push(`created_at_i>${params.createdAfter}`);
  }
  if (params.createdBefore != null) {
    filters.push(`created_at_i<${params.createdBefore}`);
  }
  if (filters.length) sp.set("numericFilters", filters.join(","));

  return fetchJson(`${BASE}/search_by_date?${sp}`);
}

/**
 * Walk newest → oldest within [after, before), slicing time windows
 * so each Algolia query stays under the 1000-hit pagination cap.
 */
export async function* iterateTimeSlices(options: {
  tags?: string;
  query?: string;
  startBefore: number;
  stopAfter: number;
  windowSeconds?: number;
  hitsPerPage?: number;
  onWindow?: (info: {
    before: number;
    after: number;
    fetched: number;
  }) => void | Promise<void>;
}): AsyncGenerator<HnHit> {
  const windowSeconds = options.windowSeconds ?? 60 * 60 * 24 * 14; // 14 days
  const hitsPerPage = options.hitsPerPage ?? 100;
  let before = options.startBefore;

  while (before > options.stopAfter) {
    const after = Math.max(options.stopAfter, before - windowSeconds);
    let page = 0;
    let fetched = 0;

    while (true) {
      const data = await searchByDate({
        tags: options.tags,
        query: options.query,
        page,
        hitsPerPage,
        createdAfter: after,
        createdBefore: before,
      });

      for (const hit of data.hits) {
        if (!hit.title) continue;
        fetched += 1;
        yield hit;
      }

      if (page + 1 >= data.nbPages || data.hits.length === 0) break;
      // Safety: Algolia hard-caps ~1000 hits per query
      if ((page + 1) * hitsPerPage >= 1000) {
        // Shrink window next time if we hit the ceiling often
        break;
      }
      page += 1;
    }

    await options.onWindow?.({ before, after, fetched });
    before = after;
  }
}

export async function fetchNewestShowHn(limit = 50): Promise<HnHit[]> {
  const data = await searchByDate({
    tags: "show_hn",
    hitsPerPage: limit,
    page: 0,
  });
  return data.hits.filter((h) => h.title);
}

export async function fetchNewestStories(limit = 50): Promise<HnHit[]> {
  const data = await searchByDate({
    tags: "story",
    hitsPerPage: limit,
    page: 0,
  });
  return data.hits.filter((h) => h.title);
}

/** Cheap prefilter for non-Show HN posts that might be product tools. */
export function looksLikeToolPost(hit: HnHit): boolean {
  if (isShowHn(hit)) return true;
  const title = (hit.title ?? "").toLowerCase();
  const url = (hit.url ?? "").toLowerCase();

  const deny =
    /\b(why |how i |ask hn|tell hn|who is hiring|launched a book|died|dies|lawsuit|acquires|ipo|layoffs)\b/i;
  if (deny.test(title)) return false;

  const allow =
    /\b(tool|toolkit|sdk|cli|api|library|framework|platform|editor|plugin|extension|dashboard|analytics|design system|figma|notion|open[- ]?source|launching|i built|we built|introducing)\b/i;
  if (allow.test(title)) return true;

  // GitHub / product domains often signal shippable tools
  if (
    /github\.com|gitlab\.com|\.dev\/|\.app\/|producthunt\.com/.test(url) &&
    !/blog|news|arxiv|wikipedia/.test(url)
  ) {
    return true;
  }

  return false;
}
