/**
 * Client-safe preview helpers (no cheerio / fetch).
 * Shelf media is Open Graph / Twitter card images only.
 */

export function looksLikeLogoUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  const u = url.toLowerCase();

  if (
    /opengraph\.githubassets\.com|og[-_.]?image|social[-_]?card|twitter[-_]?card|unfurl|\/og\.|ogimage\.|shareable-images|ph-files\.imgix|thumbnail/i.test(
      u,
    )
  ) {
    return false;
  }

  return /(?:^|[/\-_.=?])(?:logo|favicon|apple-touch|avatar|emoji|badge)(?:[/\-_.=?]|$)|\/logos\/|s2\/favicons|icon[-_.]|\.ico(?:\?|$)|imgix\.net\/[^?\s]*icon/i.test(
    u,
  );
}

export function isScreenshotPreview(url: string | null | undefined): boolean {
  if (!url) return false;
  return /image\.thum\.io|microlink\.io\//i.test(url);
}

/** True when the URL is a usable OG/social card, not a logo or screenshot service. */
export function isOgPreview(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  if (isScreenshotPreview(url)) return false;
  return !looksLikeLogoUrl(url);
}

export function isScenePreview(url: string | null | undefined): boolean {
  return isOgPreview(url);
}

export function preferScenePreview(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    if (isOgPreview(c)) return c!.trim();
  }
  return null;
}

/** Card / marquee / detail media: stored OG image only. */
export function cardMediaUrl(tool: {
  previewImageUrl?: string | null;
}): string | null {
  return preferScenePreview(tool.previewImageUrl);
}
