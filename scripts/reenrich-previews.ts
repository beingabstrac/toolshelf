import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { tools } from "../src/lib/db/schema";
import {
  isOgPreview,
  isScreenshotPreview,
  looksLikeLogoUrl,
} from "../src/lib/enrich/media";
import { enrichToolVisuals } from "../src/lib/enrich/preview";
import { isAggregatorUrl } from "../src/lib/utils";

/**
 * Refresh previews to OG images only.
 * Clears screenshot-service URLs and re-fetches og:image from each site.
 */
async function main() {
  const db = getDb();
  const limit = Number(process.argv[2] ?? "80");

  const rows = await db
    .select()
    .from(tools)
    .where(eq(tools.status, "published"));

  const targets = rows
    .filter((tool) => {
      if (isAggregatorUrl(tool.url)) return false;
      if (!tool.previewImageUrl?.trim()) return true;
      if (isScreenshotPreview(tool.previewImageUrl)) return true;
      if (looksLikeLogoUrl(tool.previewImageUrl)) return true;
      return !isOgPreview(tool.previewImageUrl);
    })
    // Empty previews first — biggest shelf visual win
    .sort((a, b) => {
      const aEmpty = a.previewImageUrl?.trim() ? 1 : 0;
      const bEmpty = b.previewImageUrl?.trim() ? 1 : 0;
      return aEmpty - bEmpty;
    })
    .slice(0, limit);

  console.log(`reenrich OG for ${targets.length} tools`);
  let updated = 0;
  let cleared = 0;

  for (const tool of targets) {
    try {
      // Aggregator URLs can't yield real product OG — just drop bad media.
      if (isAggregatorUrl(tool.url)) {
        await db
          .update(tools)
          .set({ previewImageUrl: null, updatedAt: new Date() })
          .where(eq(tools.id, tool.id));
        cleared += 1;
        console.log("clear-agg", tool.slug);
        continue;
      }

      const visuals = await enrichToolVisuals(tool.url);
      const next = visuals.previewImageUrl;
      await db
        .update(tools)
        .set({
          previewImageUrl: next,
          logoUrl: tool.logoUrl || visuals.logoUrl,
          brandColor: visuals.brandColor || tool.brandColor,
          updatedAt: new Date(),
        })
        .where(eq(tools.id, tool.id));

      if (next) {
        updated += 1;
        console.log("og", tool.slug, next.slice(0, 80));
      } else {
        cleared += 1;
        console.log("none", tool.slug);
      }
    } catch (err) {
      console.error("fail", tool.slug, err);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log({ updated, cleared });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
