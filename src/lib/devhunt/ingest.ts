import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { fetchRecentDevHuntTools, type DevHuntTool } from "./api";

function createdAtFor(tool: DevHuntTool): Date {
  if (tool.launchDate) {
    const d = new Date(`${tool.launchDate}T12:00:00.000Z`);
    if (!Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 86_400_000) {
      return d;
    }
  }
  return new Date();
}

async function upsertDevHuntCandidate(tool: DevHuntTool, stream: string) {
  const db = getDb();
  await db
    .insert(candidates)
    .values({
      source: "devhunt",
      externalId: tool.slug,
      title: tool.name,
      url: tool.url,
      author: null,
      points: 0,
      numComments: 0,
      createdAt: createdAtFor(tool),
      isShowHn: false,
      sourceStream: stream,
      payload: {
        slug: tool.slug,
        tagline: tool.tagline,
        website: tool.url,
        devhuntUrl: tool.permalink,
        logoUrl: tool.logoUrl,
        productId: tool.productId,
        launchDate: tool.launchDate,
        topics: ["dev-tools"],
      },
      decision: "pending",
    })
    .onConflictDoNothing({
      target: [candidates.source, candidates.externalId],
    });
}

export async function pollDevHunt(options?: {
  limit?: number;
}): Promise<{ inserted: number; fetched: number }> {
  const db = getDb();
  const tools = await fetchRecentDevHuntTools({
    limit: options?.limit ?? 24,
  });
  const stream = "poll_devhunt";
  let inserted = 0;

  for (const tool of tools) {
    const before = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(
        and(
          eq(candidates.source, "devhunt"),
          eq(candidates.externalId, tool.slug),
        ),
      )
      .limit(1);
    if (before.length) continue;
    await upsertDevHuntCandidate(tool, stream);
    inserted += 1;
  }

  return { inserted, fetched: tools.length };
}
