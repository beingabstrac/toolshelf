import { COLLECTIONS, getCollection } from "@/lib/collections";
import { renderOgCard } from "@/lib/og-card";
import { SITE_NAME } from "@/lib/seo";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const def = getCollection(slug);

  return renderOgCard({
    eyebrowRight: "Aisle",
    title: def?.title ?? "Aisle",
    body:
      def?.blurb ??
      `A curated group of product tools on ${SITE_NAME}.`,
    footerLeft: "Curated shelf · not a user list",
  });
}
