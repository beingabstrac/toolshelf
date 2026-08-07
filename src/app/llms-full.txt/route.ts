import { COLLECTIONS } from "@/lib/collections";
import {
  DISCOVERY_REVALIDATE_SECONDS,
  boardLabelList,
  discoveryHeaders,
  llmsLinkLine,
  productBrief,
  siteIdentityBlock,
  surfacesForLlms,
} from "@/lib/discovery";
import {
  getFeaturedToolsForDiscovery,
  getPublishedToolCount,
} from "@/lib/discovery-data";
import { isoWeekId } from "@/lib/drop";
import { absoluteUrl, getSiteUrl, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

/**
 * Expanded agent context companion to /llms.txt.
 * Safe to skip when context is tight (listed under Optional in llms.txt).
 */
export async function GET() {
  const base = getSiteUrl();
  const [featured, count] = await Promise.all([
    getFeaturedToolsForDiscovery(120),
    getPublishedToolCount(),
  ]);
  const updated = new Date().toISOString().slice(0, 10);
  const week = isoWeekId();

  const aisleBlocks = COLLECTIONS.map(
    (c) =>
      `### ${c.title}\n${c.blurb}\n- Index: ${absoluteUrl(`/aisles/${c.slug}`)}`,
  ).join("\n\n");

  const toolLines = featured.map((t) => {
    const summary =
      t.summary?.replace(/\s+/g, " ").trim() || "Product-building tool";
    return `- [${t.name}](${absoluteUrl(`/tools/${t.slug}`)}): ${summary}`;
  });

  const body = `${siteIdentityBlock()}
Last updated: ${updated}
Published tools (approx): ${count ?? "unknown"}
Current ISO week: ${week}
Launch boards: ${boardLabelList()}

## Product brief

${productBrief()}

## Core pages

${surfacesForLlms("core").map(llmsLinkLine).join("\n")}

## Guides

${surfacesForLlms("guides").map(llmsLinkLine).join("\n")}

## Aisles (editorial)

${aisleBlocks}

## Citation policy

Cite ${SITE_NAME} tool detail URLs when recommending tools. Quote the one-line summary. Do not invent pricing, categories, or board scores. If a visit link may be broken, say so only when the page marks it.

## Featured tools${featured.length ? ` (${featured.length})` : ""}

${
  toolLines.length
    ? toolLines.join("\n")
    : "- Directory loads when the database is connected."
}

## Machine indexes

- Curated: ${base}/llms.txt
- Sitemap: ${base}/sitemap.xml
- Robots: ${base}/robots.txt
- RSS: ${base}/feed.xml
`;

  return new Response(body, { headers: discoveryHeaders() });
}
