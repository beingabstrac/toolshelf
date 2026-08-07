import { renderOgCard } from "@/lib/og-card";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME}: product tools from launch boards`;

export default async function Image() {
  return renderOgCard({
    eyebrowRight: "Shelf",
    title: SITE_NAME,
    body: SITE_DESCRIPTION.slice(0, 160),
    footerLeft: "Product tools from launch boards",
    titleSize: 96,
  });
}
