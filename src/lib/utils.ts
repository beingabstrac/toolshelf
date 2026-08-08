export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeUrl(raw: string): string | null {
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProtocol);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    u.hash = "";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    if (u.pathname.endsWith("/") && u.pathname.length > 1) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return null;
  }
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Truncate long hostnames in the middle (e.g. "agentic-rag-financial-parser.onrender.com" -> "agentic...onrender.com") */
export function formatHostForDisplay(host: string, maxLen = 22): string {
  if (!host || host.length <= maxLen) return host;
  const parts = host.split(".");
  if (parts.length >= 2) {
    const tld = parts.slice(-2).join(".");
    const prefix = parts.slice(0, -2).join(".");
    if (prefix && tld) {
      const allowedPrefixLen = Math.max(5, maxLen - tld.length - 3);
      if (prefix.length > allowedPrefixLen) {
        return `${prefix.slice(0, allowedPrefixLen)}...${tld}`;
      }
    }
  }
  const front = Math.ceil((maxLen - 3) / 2);
  const back = Math.floor((maxLen - 3) / 2);
  return `${host.slice(0, front)}...${host.slice(host.length - back)}`;
}

/** Outbound Visit links: ?ref=toolshelf (same idea as Product Hunt’s ref=producthunt). */
export function withShelfRef(url: string, ref = "toolshelf"): string {
  try {
    const u = new URL(url);
    u.searchParams.set("ref", ref);
    return u.toString();
  } catch {
    return url;
  }
}

/** Launch boards / discussion hosts — never store these as the product website. */
export function isAggregatorHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.includes("producthunt.com") ||
    h.includes("news.ycombinator.com") ||
    h.includes("ycombinator.com") ||
    h.includes("lobste.rs") ||
    h.includes("reddit.com") ||
    h.includes("uneed.best") ||
    h.includes("devhunt.org")
  );
}

export function isAggregatorUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  return isAggregatorHost(hostnameFromUrl(url));
}

/** Follow one hop of redirects to recover a maker website from PH /r/ links. */
export async function resolveWebsiteUrl(
  url: string,
  timeoutMs = 8000,
): Promise<string | null> {
  const start = normalizeUrl(url);
  if (!start) return null;
  if (!isAggregatorUrl(start)) return start;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(start, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "ToolshelfBot/1.0 (+https://toolshelf.space)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);
    const finalUrl = normalizeUrl(res.url);
    if (finalUrl && !isAggregatorUrl(finalUrl)) return finalUrl;
  } catch {
    // ignore
  }
  return null;
}

export function stripShowHnPrefix(title: string): string {
  return title.replace(/^show\s*hn\s*[:\-–—]\s*/i, "").trim();
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function getToolFeatures(tool: {
  features?: string[] | null;
  summary?: string;
  inclusionReason?: string | null;
  categories?: string[];
}): string[] {
  if (tool.features && tool.features.length > 0) {
    return tool.features;
  }
  const items: string[] = [];
  if (tool.summary?.trim()) {
    items.push(tool.summary.trim());
  }
  if (
    tool.inclusionReason?.trim() &&
    tool.inclusionReason.trim() !== tool.summary?.trim()
  ) {
    items.push(tool.inclusionReason.trim());
  }
  return items;
}

export function formatRelative(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 45) return rtf.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 18) return rtf.format(months, "month");
  return rtf.format(Math.round(days / 365), "year");
}

export const CATEGORY_LABELS: Record<string, string> = {
  "dev-tools": "Dev",
  design: "Design",
  product: "Product",
  ai: "AI",
  infra: "Infra",
  data: "Data",
  "no-code": "No-code",
  marketing: "Marketing",
  security: "Security",
  collaboration: "Collab",
  "other-tools": "Other",
};

export const SOURCE_LABELS: Record<string, string> = {
  hackernews: "Hacker News",
  producthunt: "Product Hunt",
  lobsters: "Lobsters",
  reddit: "Reddit",
  uneed: "Uneed",
  devhunt: "DevHunt",
};

export function mentionHref(mention: {
  source: string;
  externalId: string;
  permalink: string | null;
}): string {
  if (mention.permalink) return mention.permalink;
  if (mention.source === "producthunt") {
    return `https://www.producthunt.com/posts/${mention.externalId}`;
  }
  if (mention.source === "lobsters") {
    return `https://lobste.rs/s/${mention.externalId}`;
  }
  if (mention.source === "reddit") {
    const id = mention.externalId.replace(/^t3_/, "");
    return `https://www.reddit.com/comments/${id}`;
  }
  if (mention.source === "uneed") {
    return `https://www.uneed.best/tool/${mention.externalId}`;
  }
  if (mention.source === "devhunt") {
    return `https://devhunt.org/tool/${mention.externalId}`;
  }
  return `https://news.ycombinator.com/item?id=${mention.externalId}`;
}
