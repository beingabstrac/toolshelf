import { hostnameFromUrl, isAggregatorHost } from "@/lib/utils";

/** Drop launch-board favicons so cards show a monogram instead of PH/HN icons. */
export function productLogoUrl(
  logoUrl: string | null | undefined,
): string | null {
  if (!logoUrl?.trim()) return null;
  const raw = logoUrl.trim();

  if (/producthunt|ycombinator|lobste\.rs|reddit\.com|uneed\.best|devhunt/i.test(raw)) {
    return null;
  }

  const domainParam = raw.match(/[?&]domain=([^&]+)/i)?.[1];
  if (domainParam) {
    const host = decodeURIComponent(domainParam).replace(/^www\./, "");
    if (isAggregatorHost(host)) return null;
  }

  try {
    if (/^https?:\/\//i.test(raw) && isAggregatorHost(hostnameFromUrl(raw))) {
      return null;
    }
  } catch {
    // keep
  }

  return raw;
}
