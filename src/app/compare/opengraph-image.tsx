import { renderCompareOg } from "@/lib/og-compare";
import { OG_SIZE } from "@/lib/og-style";
import { SITE_NAME } from "@/lib/seo";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;
export const alt = `Compare tools · ${SITE_NAME}`;

/** Default compare card — opengraph-image cannot read ?a=&b=. */
export default async function Image() {
  return renderCompareOg();
}
