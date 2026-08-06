import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tools } from "@/lib/db/schema";
import {
  isOgPreview,
  isScreenshotPreview,
  looksLikeLogoUrl,
} from "@/lib/enrich/media";
import { enrichToolVisuals } from "@/lib/enrich/preview";
import { isAggregatorUrl } from "@/lib/utils";

function needsPreviewRefresh(previewImageUrl: string | null | undefined): boolean {
  if (!previewImageUrl?.trim()) return true;
  if (isScreenshotPreview(previewImageUrl)) return true;
  if (looksLikeLogoUrl(previewImageUrl)) return true;
  return !isOgPreview(previewImageUrl);
}

/** Refresh OG previews: empty first, then logo-like / screenshot URLs. */
export async function reenrichMissingPreviews(limit = 20): Promise<{
  checked: number;
  updated: number;
  cleared: number;
}> {
  const db = getDb();
  const rows = await db
    .select()
    .from(tools)
    .where(eq(tools.status, "published"));

  const targets = rows
    .filter((tool) => {
      if (isAggregatorUrl(tool.url)) {
        return Boolean(tool.previewImageUrl?.trim());
      }
      return needsPreviewRefresh(tool.previewImageUrl);
    })
    .sort((a, b) => {
      const aEmpty = a.previewImageUrl?.trim() ? 1 : 0;
      const bEmpty = b.previewImageUrl?.trim() ? 1 : 0;
      return aEmpty - bEmpty;
    })
    .slice(0, limit);

  let updated = 0;
  let cleared = 0;

  for (const tool of targets) {
    try {
      if (isAggregatorUrl(tool.url)) {
        await db
          .update(tools)
          .set({ previewImageUrl: null, updatedAt: new Date() })
          .where(eq(tools.id, tool.id));
        cleared += 1;
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

      if (next) updated += 1;
      else cleared += 1;
    } catch (err) {
      console.error("reenrich failed", tool.slug, err);
    }
  }

  return { checked: targets.length, updated, cleared };
}
