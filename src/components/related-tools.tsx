import Link from "next/link";
import type { Tool } from "@/lib/db/schema";
import { trackAttrs } from "@/lib/analytics";
import { cardMediaUrl } from "@/lib/enrich/media";
import { buildShelfHref } from "@/lib/url-state";
import { CATEGORY_LABELS } from "@/lib/utils";
import { PreviewFrame } from "./preview-frame";
import styles from "@/app/tools/[slug]/detail.module.css";

export function RelatedTools({
  tool,
  related,
}: {
  tool: Tool;
  related: Tool[];
}) {
  if (related.length < 2) return null;

  const leadCategory = tool.categories[0];

  return (
    <section className={styles.related} aria-labelledby="related-heading">
      <div className={styles.relatedHeader}>
        <div className="section-heading">
          <p className="title-count">
            {related.length.toLocaleString()} tools
          </p>
          <h2 id="related-heading" className="section-title">
            Same aisle
          </h2>
        </div>
        <div className={styles.relatedHeaderActions}>
          <Link
            href={`/compare?a=${tool.slug}`}
            className={`btn btn-ghost ${styles.relatedCompareCta}`}
            {...trackAttrs("related_compare_click", { a: tool.slug })}
          >
            Compare
          </Link>
          {leadCategory ? (
            <Link
              href={buildShelfHref({ category: leadCategory })}
              className="section-link"
              {...trackAttrs("related_browse_click", {
                category: leadCategory,
                from_slug: tool.slug,
              })}
            >
              Browse {CATEGORY_LABELS[leadCategory] ?? leadCategory}
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M7 4h9v9M16 4 4 16" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>

      <ol className={styles.relatedGrid}>
        {related.map((item) => {
          const media = cardMediaUrl(item);
          const accent = item.brandColor ?? "oklch(0.42 0.08 145)";
          return (
            <li key={item.id} className={styles.relatedCard}>
              <Link
                href={`/tools/${item.slug}`}
                className={styles.relatedLink}
                aria-label={`${item.name}. ${item.summary}`}
                {...trackAttrs("related_tool_click", {
                  from_slug: tool.slug,
                  tool_slug: item.slug,
                })}
              >
                <div
                  className={styles.relatedMedia}
                  style={{ background: accent }}
                >
                  <PreviewFrame
                    src={media}
                    fallback={
                      <div
                        className={styles.relatedFallback}
                        style={{
                          background: `linear-gradient(160deg, ${accent} 0%, oklch(0.24 0.03 55) 100%)`,
                        }}
                        aria-hidden="true"
                      >
                        <span>{item.name}</span>
                      </div>
                    }
                  />
                </div>
                <div className={styles.relatedBody}>
                  <h3 className="teaser-title">{item.name}</h3>
                  <p>{item.summary}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
