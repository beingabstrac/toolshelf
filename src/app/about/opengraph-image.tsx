import { OG_SIZE, renderOgCard } from "@/lib/og-card";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `About · ${SITE_NAME}`;

export default async function Image() {
  return renderOgCard({
    eyebrowRight: "About",
    title: "How the shelf works",
    body: SITE_TAGLINE,
    footerLeft: "No accounts · No likes · No noise",
  });
}
