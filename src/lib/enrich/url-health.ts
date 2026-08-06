import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tools } from "@/lib/db/schema";
import { isAggregatorUrl } from "@/lib/utils";

export type UrlStatus = "unknown" | "ok" | "broken";

const STALE_MS = 1000 * 60 * 60 * 24 * 14; // recheck every 2 weeks
const UA = "ToolshelfBot/1.0 (+https://toolshelf.space; url-health)";

export async function probeUrl(
  url: string,
  timeoutMs = 10_000,
): Promise<UrlStatus> {
  if (!url || isAggregatorUrl(url)) return "broken";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "*/*" },
    });

    // Some hosts reject HEAD — retry once with GET
    if (res.status === 405 || res.status === 501 || res.status === 403) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml",
        },
      });
    }

    if (res.status >= 200 && res.status < 400) return "ok";
    if (res.status === 401 || res.status === 429) return "ok"; // alive, gated
    if (res.status >= 500) return "broken";
    if (res.status === 404 || res.status === 410) return "broken";
    return "unknown";
  } catch {
    return "broken";
  } finally {
    clearTimeout(timer);
  }
}

export async function checkToolUrls(options?: {
  limit?: number;
  force?: boolean;
}): Promise<{ checked: number; broken: number; healthy: number }> {
  const db = getDb();
  const limit = options?.limit ?? 40;
  const staleBefore = new Date(Date.now() - STALE_MS);

  const rows = options?.force
    ? await db
        .select({
          id: tools.id,
          url: tools.url,
        })
        .from(tools)
        .where(eq(tools.status, "published"))
        .orderBy(asc(tools.urlCheckedAt))
        .limit(limit)
    : await db
        .select({
          id: tools.id,
          url: tools.url,
        })
        .from(tools)
        .where(
          and(
            eq(tools.status, "published"),
            or(
              isNull(tools.urlCheckedAt),
              lt(tools.urlCheckedAt, staleBefore),
              eq(tools.urlStatus, "unknown"),
            ),
          ),
        )
        .orderBy(asc(sql`coalesce(${tools.urlCheckedAt}, '1970-01-01')`))
        .limit(limit);

  let broken = 0;
  let healthy = 0;

  for (const row of rows) {
    const status = await probeUrl(row.url);
    if (status === "broken") broken += 1;
    if (status === "ok") healthy += 1;

    await db
      .update(tools)
      .set({
        urlStatus: status,
        urlCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tools.id, row.id));
  }

  return { checked: rows.length, broken, healthy };
}

export function isUrlBroken(
  tool: { urlStatus?: string | null },
): boolean {
  return tool.urlStatus === "broken";
}
