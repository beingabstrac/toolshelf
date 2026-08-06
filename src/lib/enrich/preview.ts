import * as cheerio from "cheerio";
import { hostnameFromUrl } from "@/lib/utils";
import { isOgPreview, preferScenePreview } from "./media";

export type Enrichment = {
  logoUrl: string;
  previewImageUrl: string | null;
  brandColor: string | null;
  previewKind: "og" | null;
};

export {
  cardMediaUrl,
  isOgPreview,
  isScenePreview,
  isScreenshotPreview,
  looksLikeLogoUrl,
  preferScenePreview,
} from "./media";

const BRAND_PALETTE = [
  "oklch(0.42 0.08 145)",
  "oklch(0.5 0.1 55)",
  "oklch(0.45 0.09 30)",
  "oklch(0.4 0.07 85)",
  "oklch(0.48 0.1 20)",
  "oklch(0.38 0.05 70)",
  "oklch(0.46 0.08 165)",
  "oklch(0.35 0.04 55)",
];

function hashColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return BRAND_PALETTE[h % BRAND_PALETTE.length]!;
}

export function faviconUrl(siteUrl: string): string {
  const host = hostnameFromUrl(siteUrl);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

function absolutize(base: string, maybeRelative: string | undefined): string | null {
  if (!maybeRelative) return null;
  const raw = maybeRelative.trim();
  if (!raw || raw.startsWith("data:")) return null;
  try {
    const absolute = new URL(raw, base).toString();
    if (!/^https?:\/\//i.test(absolute)) return null;
    return absolute;
  } catch {
    return null;
  }
}

type CheerioRoot = ReturnType<typeof cheerio.load>;

function collectOgImages($: CheerioRoot, base: string): string[] {
  const attrs = [
    $('meta[property="og:image"]').attr("content"),
    $('meta[property="og:image:secure_url"]').attr("content"),
    $('meta[property="og:image:url"]').attr("content"),
    $('meta[name="og:image"]').attr("content"),
    $('meta[name="twitter:image"]').attr("content"),
    $('meta[property="twitter:image"]').attr("content"),
    $('meta[name="twitter:image:src"]').attr("content"),
    $('meta[itemprop="image"]').attr("content"),
    $('link[rel="image_src"]').attr("href"),
  ];
  const out: string[] = [];
  for (const raw of attrs) {
    const abs = absolutize(base, raw);
    if (abs && !out.includes(abs)) out.push(abs);
  }
  return out;
}

/** GitHub serves stable social cards even when the HTML has no og tags. */
export function githubSocialImage(siteUrl: string): string | null {
  try {
    const u = new URL(siteUrl);
    if (u.hostname.replace(/^www\./, "") !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repo] = parts;
    if (!owner || !repo || owner === "settings" || owner === "orgs") return null;
    return `https://opengraph.githubassets.com/1/${owner}/${repo}`;
  } catch {
    return null;
  }
}

function pickLogo($: CheerioRoot, base: string, siteUrl: string): string {
  const candidates = [
    $('link[rel="apple-touch-icon"]').attr("href"),
    $('link[rel="apple-touch-icon-precomposed"]').attr("href"),
    $('link[rel="icon"][sizes="32x32"]').attr("href"),
    $('link[rel="icon"][sizes="192x192"]').attr("href"),
    $('link[rel="shortcut icon"]').attr("href"),
    $('link[rel="icon"]').attr("href"),
  ];
  for (const raw of candidates) {
    const abs = absolutize(base, raw);
    if (abs) return abs;
  }
  return faviconUrl(siteUrl);
}

function themeColor($: CheerioRoot, seed: string): string {
  const raw =
    $('meta[name="theme-color"]').attr("content") ||
    $('meta[name="msapplication-TileColor"]').attr("content");
  if (raw && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw.trim())) {
    return raw.trim();
  }
  return hashColor(seed);
}

export async function enrichToolVisuals(siteUrl: string): Promise<Enrichment> {
  const host = hostnameFromUrl(siteUrl);
  let logoUrl = faviconUrl(siteUrl);
  const brandFallback = hashColor(host);
  const githubOg = githubSocialImage(siteUrl);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(siteUrl, {
      signal: controller.signal,
      headers: {
        // Browser-like UA — many launch sites 403 bot UAs and hide meta tags
        "User-Agent":
          "Mozilla/5.0 (compatible; ToolshelfBot/1.0; +https://toolshelf.space) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        logoUrl,
        previewImageUrl: preferScenePreview(githubOg),
        brandColor: brandFallback,
        previewKind: githubOg ? "og" : null,
      };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    logoUrl = pickLogo($, res.url || siteUrl, siteUrl);
    const brandColor = themeColor($, host);
    const base = res.url || siteUrl;
    const og = preferScenePreview(...collectOgImages($, base), githubOg);

    return {
      logoUrl,
      previewImageUrl: og,
      brandColor,
      previewKind: og ? "og" : null,
    };
  } catch {
    return {
      logoUrl,
      previewImageUrl: preferScenePreview(githubOg),
      brandColor: brandFallback,
      previewKind: githubOg ? "og" : null,
    };
  }
}
