import type { Metadata } from "next";
import { Suspense } from "react";
import { Directory } from "@/components/directory";
import { PageShelfSkeleton } from "@/components/skeletons";
import { getCachedShelf } from "@/lib/db/cached";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
import {
  buildShelfHref,
  parseCategory,
  parseHideBroken,
  parseQuery,
  parseSource,
  parseSort,
} from "@/lib/url-state";
import { CATEGORY_LABELS, SOURCE_LABELS } from "@/lib/utils";

export const revalidate = 60;

type SearchParams = Promise<{
  q?: string;
  category?: string;
  source?: string;
  sort?: string;
  hideBroken?: string;
}>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const category = parseCategory(sp.category);
  const source = parseSource(sp.source);
  const bits = [
    q ? `“${q}”` : null,
    source ? SOURCE_LABELS[source] ?? source : null,
    category ? CATEGORY_LABELS[category] ?? category : null,
  ].filter(Boolean);

  const label = bits.length ? bits.join(" · ") : "Search";
  const description = bits.length
    ? `${label} on the ${SITE_NAME} shelf.`
    : `Search product tools on ${SITE_NAME}.`;
  const path = bits.length
    ? buildShelfHref({
        q,
        category,
        source,
        sort: parseSort(sp.sort),
        hideBroken: parseHideBroken(sp.hideBroken),
      })
    : "/search";

  return {
    title: label,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${label} · ${SITE_NAME}`,
      description,
      url: absoluteUrl(path),
    },
  };
}

async function SearchBody() {
  const tools = process.env.DATABASE_URL ? await getCachedShelf() : [];
  return <Directory tools={tools} basePath="/search" variant="search" />;
}

export default function SearchPage() {
  return (
    <main id="main" className="page-stack">
      <Suspense fallback={<PageShelfSkeleton />}>
        <SearchBody />
      </Suspense>
    </main>
  );
}
