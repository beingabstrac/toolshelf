import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tools } from "@/lib/db/schema";

export type FeaturedToolRow = {
  name: string;
  slug: string;
  summary: string;
  updatedAt: Date | null;
  firstSeenAt: Date;
};

/** High-signal tools for llms.txt / llms-full (engagement, then freshness). */
export async function getFeaturedToolsForDiscovery(
  limit: number,
): Promise<FeaturedToolRow[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const db = getDb();
    const engagement = sql`(${tools.scorePeak} * 3 + ${tools.commentsPeak})`;
    return await db
      .select({
        name: tools.name,
        slug: tools.slug,
        summary: tools.summary,
        updatedAt: tools.updatedAt,
        firstSeenAt: tools.firstSeenAt,
      })
      .from(tools)
      .where(eq(tools.status, "published"))
      .orderBy(desc(engagement), desc(tools.firstSeenAt))
      .limit(limit);
  } catch (err) {
    console.error("discovery featured tools failed", err);
    return [];
  }
}

export async function getPublishedToolsForSitemap(): Promise<
  Array<{
    slug: string;
    updatedAt: Date | null;
    firstSeenAt: Date;
  }>
> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const db = getDb();
    return await db
      .select({
        slug: tools.slug,
        updatedAt: tools.updatedAt,
        firstSeenAt: tools.firstSeenAt,
      })
      .from(tools)
      .where(eq(tools.status, "published"))
      .orderBy(desc(tools.updatedAt));
  } catch (err) {
    console.error("sitemap tools failed", err);
    return [];
  }
}

export async function getPublishedToolCount(): Promise<number | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const db = getDb();
    const rows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tools)
      .where(eq(tools.status, "published"));
    return rows[0]?.n ?? 0;
  } catch {
    return null;
  }
}
