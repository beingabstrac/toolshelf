import { COLLECTIONS } from "@/lib/collections";
import { OG_SIZE, renderOgCard } from "@/lib/og-card";
import { SITE_NAME } from "@/lib/seo";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `Aisles · ${SITE_NAME}`;

export default async function Image() {
  const count = COLLECTIONS.length;
  return renderOgCard({
    eyebrowRight: `${count} aisles`,
    title: "Aisles",
    body: "Curated groups of tools. We pick the shelves, not users.",
    footerLeft: "Browse by craft, not by hype",
  });
}
