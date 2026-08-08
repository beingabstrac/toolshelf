import Link from "next/link";
import { trackAttrs } from "@/lib/analytics";
import type { Metadata } from "next";
import { PreviewFrame } from "@/components/preview-frame";
import { COLLECTIONS, getMatchingCollectionTools } from "@/lib/collections";
import { getCachedWideShelf } from "@/lib/db/cached";
import { cardMediaUrl } from "@/lib/enrich/media";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
import styles from "./aisles.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Aisles",
  description: `Curated groups of product tools on ${SITE_NAME}.`,
  alternates: { canonical: "/aisles" },
  openGraph: {
    title: `Aisles · ${SITE_NAME}`,
    url: absoluteUrl("/aisles"),
  },
};

export default async function AislesIndexPage() {
  const tools = process.env.DATABASE_URL ? await getCachedWideShelf() : [];
  const aisles = COLLECTIONS.map((def) => {
    const matched = getMatchingCollectionTools(tools, def);
    return {
      def,
      picks: matched.slice(0, 3),
      count: matched.length,
    };
  }).filter((row) => row.picks.length >= 2);

  return (
    <main id="main" className="page-stack">
      <header className="page-header">
        <p className="title-count">
          {aisles.length.toLocaleString()} aisles
        </p>
        <h1 className="page-title">Aisles</h1>
        <p className="page-lede">
          Curated groups of tools. We pick the shelves, not users.
        </p>
      </header>

      <ul className={`${styles.grid} home-open`}>
        {aisles.map(({ def, picks, count }) => (
          <li key={def.slug}>
            <Link
              href={`/aisles/${def.slug}`}
              className={`${styles.card} teaser-card`}
              {...trackAttrs("aisle_click", { aisle: def.slug, placement: "aisles_index", tool_count: count })}
            >
              <div className={styles.thumbs} aria-hidden="true">
                {picks.map((tool) => {
                  const media = cardMediaUrl(tool);
                  const accent = tool.brandColor ?? "oklch(0.42 0.08 145)";
                  return (
                    <div
                      key={tool.id}
                      className={`${styles.thumb} teaser-media`}
                      style={{ background: accent }}
                    >
                      <PreviewFrame
                        src={media}
                        fallback={
                          <div
                            className="tool-card-fallback"
                            style={{
                              background: `linear-gradient(160deg, ${accent} 0%, oklch(0.24 0.03 55) 100%)`,
                            }}
                          >
                            <span className="tool-card-fallback-name">
                              {tool.name}
                            </span>
                          </div>
                        }
                      />
                    </div>
                  );
                })}
              </div>
              <div className={styles.body}>
                <p className="title-count">
                  {count.toLocaleString()} tools
                </p>
                <strong className="teaser-title">{def.title}</strong>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
