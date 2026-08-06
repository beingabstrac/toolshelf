const BASE = "https://mcp.uneed.best";

export type UneedProduct = {
  name: string;
  slug: string;
  description: string;
  url: string;
  uneed_url: string;
  logo: string | null;
  category: string;
  pricing?: string | null;
  launch_date?: string | null;
  created_at?: string | null;
  vote_count?: number;
  vote_value_sum?: number;
  rank?: number;
  open_source?: boolean;
  repo_url?: string | null;
};

/** Categories that usually hold product-building tools. */
export const UNEED_INGEST_CATEGORIES = [
  "development",
  "design",
  "business",
] as const;

const SKIP_CATEGORIES = new Set(["personal life", "personal-life"]);

const UA = "ToolshelfBot/1.0 (+https://toolshelf.space)";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Uneed ${res.status}: ${path}`);
  }
  return (await res.json()) as T;
}

export function isIngestableUneedCategory(category: string): boolean {
  return !SKIP_CATEGORIES.has(category.trim().toLowerCase());
}

export async function fetchLaunchesByCategory(
  category: string,
  limit = 25,
): Promise<UneedProduct[]> {
  const q = new URLSearchParams({
    category,
    limit: String(limit),
  });
  const data = await getJson<{ launches: UneedProduct[] }>(
    `/v1/launches?${q}`,
  );
  return data.launches ?? [];
}

export async function fetchTrending(
  period: "daily" | "weekly" = "daily",
  limit = 25,
): Promise<UneedProduct[]> {
  const q = new URLSearchParams({
    period,
    limit: String(limit),
  });
  const data = await getJson<{ ranking: UneedProduct[] }>(
    `/v1/trending?${q}`,
  );
  return data.ranking ?? [];
}

export async function searchUneed(
  query: string,
  limit = 8,
): Promise<UneedProduct[]> {
  const q = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  const data = await getJson<{ results: UneedProduct[] }>(`/v1/search?${q}`);
  return data.results ?? [];
}

export async function fetchRecentUneedProducts(options?: {
  perCategory?: number;
  trendingLimit?: number;
}): Promise<UneedProduct[]> {
  const perCategory = options?.perCategory ?? 20;
  const trendingLimit = options?.trendingLimit ?? 20;

  const [byCat, trending] = await Promise.all([
    Promise.all(
      UNEED_INGEST_CATEGORIES.map((c) =>
        fetchLaunchesByCategory(c, perCategory),
      ),
    ),
    fetchTrending("daily", trendingLimit),
  ]);

  const merged = new Map<string, UneedProduct>();
  for (const product of [...byCat.flat(), ...trending]) {
    if (!product.slug || !product.url?.trim()) continue;
    if (!isIngestableUneedCategory(product.category ?? "")) continue;
    const prev = merged.get(product.slug);
    if (!prev) {
      merged.set(product.slug, product);
      continue;
    }
    // Prefer the copy with vote stats (trending) when available.
    if ((product.vote_value_sum ?? 0) > (prev.vote_value_sum ?? 0)) {
      merged.set(product.slug, { ...prev, ...product });
    }
  }

  return [...merged.values()];
}
