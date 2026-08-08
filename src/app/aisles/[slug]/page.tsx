import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolGrid } from "@/components/tool-grid";
import {
  COLLECTIONS,
  getCollection,
  getMatchingCollectionTools,
} from "@/lib/collections";
import { getCachedWideShelf } from "@/lib/db/cached";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

export const revalidate = 60;

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const def = getCollection(slug);
  if (!def) return { title: "Aisle not found" };
  return {
    title: def.title,
    description: def.blurb,
    alternates: { canonical: `/aisles/${def.slug}` },
    openGraph: {
      title: `${def.title} · ${SITE_NAME}`,
      description: def.blurb,
      url: absoluteUrl(`/aisles/${def.slug}`),
    },
  };
}

export default async function AislePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const def = getCollection(slug);
  if (!def) notFound();

  const shelf = process.env.DATABASE_URL ? await getCachedWideShelf() : [];
  const tools = getMatchingCollectionTools(shelf, def);

  return (
    <main id="main" className="page-stack">
      <header className="page-header">
        <p className="title-count">
          {tools.length.toLocaleString()} tools
        </p>
        <h1 className="page-title">{def.title}</h1>
        <p className="page-lede">{def.blurb}</p>
      </header>

      <div className="home-open">
        <ToolGrid tools={tools} placement="aisle" />
      </div>
    </main>
  );
}
