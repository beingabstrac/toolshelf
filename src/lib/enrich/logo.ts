import { hostnameFromUrl, isAggregatorHost } from "@/lib/utils";

/** Drop launch-board favicons and generic browser globes so cards show a sleek monogram instead. */
export function productLogoUrl(
  logoUrl: string | null | undefined,
): string | null {
  if (!logoUrl?.trim()) return null;
  const raw = logoUrl.trim();

  // Filter out launch-board logos
  if (/producthunt|ycombinator|lobste\.rs|reddit\.com|uneed\.best|devhunt/i.test(raw)) {
    return null;
  }

  // Filter out Google s2 default favicon fallbacks and generic browser globes
  if (/s2\/favicons|default_favicon|generic_favicon|chrome:\/\/|about:blank/i.test(raw)) {
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
