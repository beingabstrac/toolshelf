import { renderCompareOg } from "@/lib/og-compare";
import { SITE_NAME } from "@/lib/seo";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `Compare tools · ${SITE_NAME}`;

/** Default compare card — opengraph-image cannot read ?a=&b=. */
export default async function Image() {
  return renderCompareOg();
}
