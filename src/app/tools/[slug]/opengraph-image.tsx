import { getToolBySlug } from "@/lib/db/queries";
import { OG_SIZE, renderOgCard } from "@/lib/og-card";
import { SITE_NAME } from "@/lib/seo";
import { CATEGORY_LABELS } from "@/lib/utils";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = process.env.DATABASE_URL ? await getToolBySlug(slug) : null;
  const name = tool?.name ?? SITE_NAME;
  const summary =
    tool?.summary?.slice(0, 140) ??
    "Product-building tools from launch communities.";
  const cats = (tool?.categories ?? [])
    .slice(0, 2)
    .map((c) => CATEGORY_LABELS[c] ?? c)
    .join(" · ");

  return renderOgCard({
    eyebrowRight: cats || "Launch index",
    title: name,
    body: summary,
    footerLeft: "Product tools from launch boards",
  });
}
