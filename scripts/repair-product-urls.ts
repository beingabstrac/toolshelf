import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { withGeminiRotate } from "../src/lib/ai/google";
import { getDb } from "../src/lib/db";
import { tools } from "../src/lib/db/schema";
import { enrichToolVisuals } from "../src/lib/enrich/preview";
import {
  isAggregatorUrl,
  normalizeUrl,
  resolveWebsiteUrl,
} from "../src/lib/utils";

const guessSchema = z.object({
  website: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

async function guessWebsite(tool: {
  name: string;
  summary: string;
}): Promise<string | null> {
  const object = await withGeminiRotate(async (model) => {
    const { object } = await generateObject({
      model,
      schema: guessSchema,
      prompt: `Find the official product website for this tool.
Return only the homepage URL (https://...), or null if unsure.
Never return producthunt.com, news.ycombinator.com, lobste.rs, reddit.com, uneed.best, or devhunt.org.

Name: ${tool.name}
Summary: ${tool.summary}`,
    });
    return object;
  });

  if (!object.website || object.confidence < 0.65) return null;
  const url = normalizeUrl(object.website);
  if (!url || isAggregatorUrl(url)) return null;
  return url;
}

/** Fix tools stuck on Product Hunt / launch-board redirect URLs. */
async function main() {
  const db = getDb();
  const rows = await db
    .select()
    .from(tools)
    .where(eq(tools.status, "published"));

  const broken = rows.filter((t) => isAggregatorUrl(t.url));
  console.log(`repair ${broken.length} aggregator URLs`);

  let fixed = 0;
  let failed = 0;

  for (const tool of broken) {
    try {
      let resolved = await resolveWebsiteUrl(tool.url);
      if (!resolved || isAggregatorUrl(resolved)) {
        resolved = await guessWebsite(tool);
        await new Promise((r) => setTimeout(r, 7000));
      }
      if (!resolved || isAggregatorUrl(resolved)) {
        failed += 1;
        console.log("skip", tool.slug, tool.url);
        continue;
      }

      const clash = await db
        .select({ id: tools.id, slug: tools.slug })
        .from(tools)
        .where(eq(tools.url, resolved))
        .limit(1);

      if (clash[0] && clash[0].id !== tool.id) {
        console.log(
          "merge-skip",
          tool.slug,
          "→ already have",
          clash[0].slug,
          resolved,
        );
        failed += 1;
        continue;
      }

      const visuals = await enrichToolVisuals(resolved);
      await db
        .update(tools)
        .set({
          url: normalizeUrl(resolved) || resolved,
          logoUrl: visuals.logoUrl,
          previewImageUrl: visuals.previewImageUrl,
          brandColor: visuals.brandColor || tool.brandColor,
          updatedAt: new Date(),
        })
        .where(eq(tools.id, tool.id));

      fixed += 1;
      console.log("ok", tool.slug, "→", resolved);
    } catch (err) {
      failed += 1;
      console.error("fail", tool.slug, err);
      await new Promise((r) => setTimeout(r, 15_000));
    }
  }

  console.log({ fixed, failed });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
