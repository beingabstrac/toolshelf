import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tools } from "@/lib/db/schema";
import { DISCOVERY_REVALIDATE_SECONDS } from "@/lib/discovery";
import { isoWeekId, pickWeeklyDrop } from "@/lib/drop";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  getSiteUrl,
} from "@/lib/seo";

export const revalidate = 3600;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * RSS 2.0 feed of this week’s drop + newest published tools.
 * Freshness signal for readers and agents.
 */
export async function GET() {
  const base = getSiteUrl();
  const week = isoWeekId();
  const now = new Date().toUTCString();

  type Item = {
    title: string;
    link: string;
    description: string;
    pubDate: string;
    guid: string;
  };

  const items: Item[] = [
    {
      title: `This week’s shelf drop · ${week}`,
      link: absoluteUrl("/drop"),
      description: `New product tools on ${SITE_NAME} for ${week}.`,
      pubDate: now,
      guid: absoluteUrl(`/drop#${week}`),
    },
  ];

  if (process.env.DATABASE_URL) {
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(tools)
        .where(eq(tools.status, "published"))
        .orderBy(desc(tools.firstSeenAt))
        .limit(80);

      const drop = pickWeeklyDrop(rows).slice(0, 40);
      const source = drop.length ? drop : rows.slice(0, 40);

      for (const tool of source) {
        const link = absoluteUrl(`/tools/${tool.slug}`);
        items.push({
          title: tool.name,
          link,
          description:
            tool.summary?.replace(/\s+/g, " ").trim() ||
            `Product-building tool on ${SITE_NAME}.`,
          pubDate: new Date(tool.firstSeenAt).toUTCString(),
          guid: link,
        });
      }
    } catch (err) {
      console.error("feed.xml failed", err);
    }
  }

  const channelItems = items
    .map(
      (item) => `    <item>
      <title>${xmlEscape(item.title)}</title>
      <link>${xmlEscape(item.link)}</link>
      <guid isPermaLink="true">${xmlEscape(item.guid)}</guid>
      <pubDate>${xmlEscape(item.pubDate)}</pubDate>
      <description>${xmlEscape(item.description)}</description>
    </item>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(SITE_NAME)}</title>
    <link>${xmlEscape(base)}</link>
    <description>${xmlEscape(SITE_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${xmlEscape(now)}</lastBuildDate>
${channelItems}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${DISCOVERY_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
    },
  });
}
