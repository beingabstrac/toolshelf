import type { MetadataRoute } from "next";
import { indexableSurfaces } from "@/lib/discovery";
import { getPublishedToolsForSitemap } from "@/lib/discovery-data";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = indexableSurfaces().map((surface) => ({
    url: surface.path === "/" ? getSiteUrl() : absoluteUrl(surface.path),
    lastModified: now,
    changeFrequency: surface.changeFrequency,
    priority: surface.priority,
  }));

  const toolRows = await getPublishedToolsForSitemap();
  for (const row of toolRows) {
    entries.push({
      url: absoluteUrl(`/tools/${row.slug}`),
      lastModified: row.updatedAt ?? row.firstSeenAt ?? now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
