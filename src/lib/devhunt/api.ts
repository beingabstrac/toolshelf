const SITEMAP = "https://devhunt.org/sitemap.xml";
const UA = "ToolshelfBot/1.0 (+https://toolshelf.space)";

export type DevHuntTool = {
  slug: string;
  name: string;
  tagline: string;
  url: string;
  productId: string;
  launchDate: string | null;
  logoUrl: string | null;
  permalink: string;
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml",
      "User-Agent": UA,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`DevHunt ${res.status}: ${url}`);
  }
  return res.text();
}

/** Newest tool URLs tend to sit at the end of the sitemap. */
export async function fetchRecentToolSlugs(limit = 40): Promise<string[]> {
  const xml = await fetchText(SITEMAP);
  const urls = [...xml.matchAll(/<loc>(https:\/\/devhunt\.org\/tool\/[^<]+)<\/loc>/g)]
    .map((m) => m[1])
    .filter((u) => !u.includes("/tool/-")); // skip odd slug noise

  const slugs: string[] = [];
  for (const url of urls.slice(-limit).reverse()) {
    const slug = url.replace(/^https:\/\/devhunt\.org\/tool\//, "").trim();
    if (slug) slugs.push(slug);
  }
  return slugs;
}

function metaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `(?:property|name)="${property}"\\s+content="([^"]*)"|content="([^"]*)"\\s+(?:property|name)="${property}"`,
    "i",
  );
  const m = html.match(re);
  return (m?.[1] || m?.[2] || "").trim() || null;
}

/** Normalize Next.js flight payload escapes enough to regex fields. */
function normalizeFlight(html: string): string {
  return html
    .replace(/\\"/g, '"')
    .replace(/\\\//g, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003d/gi, "=");
}

export async function fetchDevHuntTool(
  slug: string,
): Promise<DevHuntTool | null> {
  const permalink = `https://devhunt.org/tool/${slug}`;
  const html = await fetchText(permalink);
  const flight = normalizeFlight(html);

  const live = flight.match(
    /href":"(https?:\/\/[^"]+\?ref=devhunt)"/,
  )?.[1];
  if (!live) return null;

  let url: string;
  try {
    const u = new URL(live);
    u.searchParams.delete("ref");
    url = u.toString();
  } catch {
    return null;
  }

  const ogTitle = metaContent(html, "og:title") || "";
  const ogDescription = metaContent(html, "og:description") || "";
  let name = ogTitle;
  let tagline = ogDescription;
  const dash = ogTitle.indexOf(" - ");
  if (dash > 0) {
    name = ogTitle.slice(0, dash).trim();
    if (!tagline) tagline = ogTitle.slice(dash + 3).trim();
  }

  const productId =
    flight.match(/"productId":(\d+)/)?.[1] ||
    flight.match(/"productId":"(\d+)"/)?.[1] ||
    slug;
  const launchDate = flight.match(/"launchDate":"([^"]+)"/)?.[1] ?? null;
  const logoUrl =
    flight.match(
      /src":"(https:\/\/mars-images\.imgix\.net\/[^"]*icon[^"]*)"/i,
    )?.[1] ?? null;

  if (!name) return null;

  return {
    slug,
    name,
    tagline,
    url,
    productId,
    launchDate,
    logoUrl,
    permalink,
  };
}

export async function fetchRecentDevHuntTools(options?: {
  limit?: number;
  concurrency?: number;
}): Promise<DevHuntTool[]> {
  const limit = options?.limit ?? 24;
  const concurrency = options?.concurrency ?? 4;
  const slugs = await fetchRecentToolSlugs(limit);
  const tools: DevHuntTool[] = [];

  for (let i = 0; i < slugs.length; i += concurrency) {
    const batch = slugs.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((slug) => fetchDevHuntTool(slug)),
    );
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value) {
        tools.push(result.value);
      }
    }
  }

  return tools;
}
