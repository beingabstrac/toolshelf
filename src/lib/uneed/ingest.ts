import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { fetchRecentUneedProducts, type UneedProduct } from "./api";

function pointsFor(product: UneedProduct): number {
  if (typeof product.vote_value_sum === "number") return product.vote_value_sum;
  if (typeof product.vote_count === "number") return product.vote_count;
  return 0;
}

function createdAtFor(product: UneedProduct): Date {
  if (product.created_at) {
    const d = new Date(product.created_at);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (product.launch_date) {
    const d = new Date(`${product.launch_date}T12:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

async function upsertUneedCandidate(product: UneedProduct, stream: string) {
  const db = getDb();
  await db
    .insert(candidates)
    .values({
      source: "uneed",
      externalId: product.slug,
      title: product.name,
      url: product.url,
      author: null,
      points: pointsFor(product),
      numComments: 0,
      createdAt: createdAtFor(product),
      isShowHn: false,
      sourceStream: stream,
      payload: {
        slug: product.slug,
        tagline: product.description,
        uneedUrl: product.uneed_url,
        website: product.url,
        logoUrl: product.logo,
        category: product.category,
        pricing: product.pricing ?? null,
        topics: product.category ? [product.category] : [],
        voteCount: product.vote_count ?? null,
        openSource: product.open_source ?? null,
        repoUrl: product.repo_url ?? null,
      },
      decision: "pending",
    })
    .onConflictDoNothing({
      target: [candidates.source, candidates.externalId],
    });
}

export async function pollUneed(options?: {
  perCategory?: number;
  trendingLimit?: number;
}): Promise<{ inserted: number; fetched: number }> {
  const db = getDb();
  const products = await fetchRecentUneedProducts(options);
  const stream = "poll_uneed";
  let inserted = 0;

  for (const product of products) {
    const before = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(
        and(
          eq(candidates.source, "uneed"),
          eq(candidates.externalId, product.slug),
        ),
      )
      .limit(1);
    if (before.length) continue;
    await upsertUneedCandidate(product, stream);
    inserted += 1;
  }

  return { inserted, fetched: products.length };
}
