import Link from "next/link";
import { trackAttrs } from "@/lib/analytics";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { PreviewFrame } from "@/components/preview-frame";
import { ShareDrop } from "@/components/share-drop";
import { getCachedShelf } from "@/lib/db/cached";
import {
  dropShareText,
  dropWeekLabel,
  isoWeekId,
  listRecentWeekIds,
  pickWeeklyDrop,
} from "@/lib/drop";
import { cardMediaUrl } from "@/lib/enrich/media";
import {
  SITE_NAME,
  absoluteUrl,
  itemListJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import styles from "./drop.module.css";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const tools = process.env.DATABASE_URL ? await getCachedShelf() : [];
  const fresh = pickWeeklyDrop(tools);
  const week = dropWeekLabel();
  const title = "This week’s shelf drop";
  const description =
    fresh.length > 0
      ? `${fresh.length} tools that landed the week of ${week}, from HN, Product Hunt, Lobsters, Uneed, and DevHunt.`
      : `New product tools on ${SITE_NAME} this week.`;

  return {
    title,
    description,
    alternates: { canonical: "/drop" },
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url: absoluteUrl("/drop"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
    },
  };
}

export default async function DropPage() {
  const tools = process.env.DATABASE_URL ? await getCachedShelf() : [];
  const fresh = pickWeeklyDrop(tools);
  const week = dropWeekLabel();
  const currentWeekId = isoWeekId();
  const archives = listRecentWeekIds(12).filter((id) => id !== currentWeekId);
  const highlightNames = fresh.slice(0, 6).map((t) => t.name);
  const shareTitle = `This week’s shelf drop · ${SITE_NAME}`;
  const shareText = dropShareText(fresh.length, highlightNames);

  return (
    <main id="main" className="page-stack">
      <JsonLd data={websiteJsonLd(fresh.length)} />
      {fresh.length ? <JsonLd data={itemListJsonLd(fresh)} /> : null}

      <header className="page-header">
        <p className="title-count">
          {fresh.length.toLocaleString()} tools
        </p>
        <h1 className="page-title">This week’s drop</h1>
        <p className="page-lede">
          Week of {week}. New tools from the last seven days. Share the link if
          it helps.
        </p>
        <div className={styles.actions}>
          <ShareDrop
            title={shareTitle}
            text={shareText}
            url={`/drop/${currentWeekId}`}
          />
        </div>
      </header>

      {fresh.length ? (
        <ol className={`${styles.list} home-open`}>
          {fresh.map((tool) => {
            const media = cardMediaUrl(tool);
            const accent = tool.brandColor ?? "oklch(0.42 0.08 145)";
            return (
              <li key={tool.id}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className={`${styles.card} teaser-card`}
                  {...trackAttrs("tool_card_open", { tool_slug: tool.slug, placement: "drop", method: "click" })}
                >
                  <div
                    className={`${styles.media} teaser-media`}
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
                          aria-hidden="true"
                        >
                          <span className="tool-card-fallback-name">
                            {tool.name}
                          </span>
                        </div>
                      }
                    />
                  </div>
                  <div className={styles.body}>
                    <h2 className="teaser-title">{tool.name}</h2>
                    <p>{tool.summary}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="empty-state">
          <h2>Nothing new this week yet</h2>
          <p>Check back after more launches land on the shelf.</p>
          <div className="empty-actions">
            <Link className="btn" href="/" {...trackAttrs("empty_cta_click", { cta: "browse_shelf", placement: "drop" })}>
              Browse the full shelf
            </Link>
          </div>
        </div>
      )}

      {archives.length ? (
        <nav className={styles.archive} aria-label="Earlier drops">
          <p className="title-count">Earlier weeks</p>
          <ul className={styles.archiveList}>
            {archives.map((id) => (
              <li key={id}>
                <Link href={`/drop/${id}`} {...trackAttrs("drop_archive_click", { week: id, placement: "drop_index" })}>{id}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </main>
  );
}
