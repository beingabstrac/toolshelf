import { OG_SIZE, renderOgCard } from "@/lib/og-card";
import { SITE_NAME } from "@/lib/seo";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `Search · ${SITE_NAME}`;

export default async function Image() {
  return renderOgCard({
    eyebrowRight: "Search",
    title: "Find a tool",
    body: "Search the shelf by name, board, or what you’re building.",
    footerLeft: "Focused results · no home chrome",
  });
}
