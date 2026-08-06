import Link from "next/link";
import { trackAttrs } from "@/lib/analytics";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { PreviewFrame } from "@/components/preview-frame";
import { ShareDrop } from "@/components/share-drop";
import { getCachedToolsSeenBetween } from "@/lib/db/cached";
import {
  dropShareText,
  listRecentWeekIds,
  parseWeekId,
  weekRange,
  weekRangeLabel,
} from "@/lib/drop";
import { cardMediaUrl } from "@/lib/enrich/media";
import {
  SITE_NAME,
  absoluteUrl,
  itemListJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import styles from "../drop.module.css";

export const revalidate = 60;

export function generateStaticParams() {
  return listRecentWeekIds(12).map((week) => ({ week }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}): Promise<Metadata> {
  const { week } = await params;
  if (!parseWeekId(week)) return { title: "Drop not found" };
  const label = weekRangeLabel(week);
  const title = `Shelf drop · ${week}`;
  const description = `Tools that landed the week of ${label} on ${SITE_NAME}.`;
  return {
    title,
    description,
    alternates: { canonical: `/drop/${week}` },
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url: absoluteUrl(`/drop/${week}`),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
    },
  };
}

export default async function DropWeekPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  const range = weekRange(week);
  if (!range) notFound();

  const tools = process.env.DATABASE_URL
    ? await getCachedToolsSeenBetween(
        range.start.toISOString(),
        range.end.toISOString(),
      )
    : [];
  const label = weekRangeLabel(week);
  const highlightNames = tools.slice(0, 6).map((t) => t.name);
  const shareTitle = `Shelf drop ${week} · ${SITE_NAME}`;
  const shareText = dropShareText(tools.length, highlightNames);
  const archives = listRecentWeekIds(12).filter((id) => id !== week);

  return (
    <main id="main" className="page-stack">
      <JsonLd data={websiteJsonLd(tools.length)} />
      {tools.length ? <JsonLd data={itemListJsonLd(tools)} /> : null}

      <header className="page-header">
        <p className="title-count">{tools.length.toLocaleString()} tools</p>
        <h1 className="page-title">Drop {week}</h1>
        <p className="page-lede">
          Week of {label}. Tools first seen that week.
        </p>
        <div className={styles.actions}>
          <ShareDrop
            title={shareTitle}
            text={shareText}
            url={`/drop/${week}`}
          />
          <Link href="/drop" className="section-link" {...trackAttrs("section_click", { section: "drop", label: "This week", href: "/drop" })}>
            This week
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7 4h9v9M16 4 4 16" />
            </svg>
          </Link>
        </div>
      </header>

      {tools.length ? (
        <ol className={`${styles.list} home-open`}>
          {tools.map((tool) => {
            const media = cardMediaUrl(tool);
            const accent = tool.brandColor ?? "oklch(0.42 0.08 145)";
            return (
              <li key={tool.id}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className={`${styles.card} teaser-card`}
                  {...trackAttrs("tool_card_open", { tool_slug: tool.slug, placement: "drop_week", method: "click" })}
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
          <h2>No tools for this week</h2>
          <p>Try another week from the archive, or browse the shelf.</p>
          <div className="empty-actions">
            <Link className="btn" href="/drop" {...trackAttrs("empty_cta_click", { cta: "this_week_drop", placement: "drop_week" })}>
              This week’s drop
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
                <Link href={`/drop/${id}`} {...trackAttrs("drop_archive_click", { week: id, placement: "drop_week" })}>{id}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </main>
  );
}
