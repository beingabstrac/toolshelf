import Link from "next/link";
import type { Metadata } from "next";
import { after } from "next/server";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { PreviewFrame } from "@/components/preview-frame";
import { ComparePeers } from "@/components/compare-peers";
import { RelatedTools } from "@/components/related-tools";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import { SourceName } from "@/components/source-mark";
import {
  getCachedInclusionReason,
  getCachedMentionViews,
  getCachedRelatedTools,
  getCachedToolBySlug,
} from "@/lib/db/cached";
import { ensureCrossSourceMentions } from "@/lib/db/mentions";
import { cardMediaUrl } from "@/lib/enrich/media";
import {
  SITE_NAME,
  breadcrumbJsonLd,
  softwareApplicationJsonLd,
  toolMetadata,
} from "@/lib/seo";
import { buildShelfHref } from "@/lib/url-state";
import { trackAttrs } from "@/lib/analytics";
import {
  CATEGORY_LABELS,
  formatRelative,
  hostnameFromUrl,
  withShelfRef,
} from "@/lib/utils";
import styles from "./detail.module.css";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getCachedToolBySlug(slug);
  if (!tool) {
    return { title: "Tool not found", robots: { index: false, follow: false } };
  }
  return toolMetadata(tool);
}

function scoreLabel(source: string, score: number, comments: number): string {
  const unit =
    source === "producthunt" || source === "reddit" || source === "uneed"
      ? "upvotes"
      : source === "devhunt"
        ? "votes"
        : "points";
  if (comments > 0) {
    return `${score.toLocaleString()} ${unit} · ${comments.toLocaleString()} comments`;
  }
  return `${score.toLocaleString()} ${unit}`;
}

const GENERIC_NAME_WORDS = new Set([
  "with",
  "from",
  "your",
  "that",
  "this",
  "tool",
  "app",
  "product",
  "platform",
  "the",
  "and",
  "for",
  "open",
  "source",
]);

function mentionTitle(toolName: string, raw: string): string {
  const name = toolName.trim();
  if (!name) return raw;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = raw
    .replace(new RegExp(`^show\\s*hn\\s*[:\\-–—]\\s*`, "i"), "")
    .replace(new RegExp(`^${escaped}\\s*[:\\-–—|]\\s*`, "i"), "")
    .replace(new RegExp(`^${escaped}\\s+`, "i"), "")
    .trim();
  if (!stripped || stripped.toLowerCase() === name.toLowerCase()) {
    return "Launch thread";
  }
  const words = stripped.split(/\s+/).filter(Boolean);
  if (
    words.length <= 2 &&
    words.every((w) => GENERIC_NAME_WORDS.has(w.toLowerCase()))
  ) {
    return "Launch thread";
  }
  return stripped;
}

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = await getCachedToolBySlug(slug);
  if (!tool) notFound();

  const [mentions, related, whyHere] = await Promise.all([
    getCachedMentionViews(tool.id),
    getCachedRelatedTools(tool, 6),
    getCachedInclusionReason(tool.slug),
  ]);

  after(() => {
    ensureCrossSourceMentions(tool).catch((err) =>
      console.error("mention enrich failed", tool.slug, err),
    );
  });

  const sources = Array.from(
    new Set([
      ...(tool.sources ?? []),
      ...mentions.map((mention) => mention.source),
    ]),
  );
  const host = hostnameFromUrl(tool.url);
  const previewSrc = cardMediaUrl(tool);
  const boardCount = sources.length;

  return (
    <main id="main" className={styles.page}>
      <JsonLd data={softwareApplicationJsonLd(tool)} />
      <JsonLd data={breadcrumbJsonLd(tool)} />
      <section className={styles.showcase} aria-labelledby="tool-title">
        <div
          className={styles.previewRail}
          style={{
            backgroundColor: tool.brandColor ?? "oklch(0.42 0.08 145)",
          }}
        >
          <div className={styles.preview}>
            <PreviewFrame
              src={previewSrc}
              alt={`Preview of ${tool.name}`}
              priority
              position="center"
              fallback={
                <div className={styles.previewFallback} aria-hidden="true">
                  <span>{tool.name}</span>
                </div>
              }
            />
          </div>
        </div>

        <div className={styles.productInfo}>
          <div className={styles.categories}>
            {tool.categories.map((c) => (
              <Link
                key={c}
                href={buildShelfHref({ category: c })}
                className={`tag ${styles.category}`}
                {...trackAttrs("category_chip_click", {
                  category: c,
                  tool_slug: tool.slug,
                })}
              >
                {CATEGORY_LABELS[c] ?? c}
              </Link>
            ))}
          </div>
          <h1 id="tool-title">{tool.name}</h1>
          <p className={styles.summary}>{tool.summary}</p>

          {whyHere ? (
            <div className={styles.whyHere}>
              <p className="title-count">Why it is here</p>
              <p>{whyHere}</p>
            </div>
          ) : null}

          {boardCount > 0 ? (
            <div className={styles.boardTrail} aria-label="Launch boards">
              <p className={`eyebrow ${styles.boardTrailLabel}`}>
                {boardCount > 1
                  ? `On ${boardCount} boards`
                  : "Seen on"}
              </p>
              <ol className={styles.boardTrailList}>
                {sources.map((source, i) => (
                  <li key={source}>
                    {i > 0 ? (
                      <span className={styles.boardTrailJoin} aria-hidden="true">
                        →
                      </span>
                    ) : null}
                    <Link
                      href={buildShelfHref({ source })}
                      className={styles.boardTrailChip}
                      data-source={source}
                      {...trackAttrs("source_chip_click", {
                        source,
                        tool_slug: tool.slug,
                      })}
                    >
                      <SourceName source={source} />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <dl className={styles.facts}>
            <div>
              <dt>First seen</dt>
              <dd>{formatRelative(new Date(tool.firstSeenAt))}</dd>
            </div>
            <div>
              <dt>Best score</dt>
              <dd>
                {tool.scorePeak.toLocaleString()} points
                {tool.commentsPeak > 0
                  ? ` · ${tool.commentsPeak.toLocaleString()} comments`
                  : ""}
              </dd>
            </div>
          </dl>

          {tool.urlStatus === "broken" ? (
            <p className={styles.linkWarn}>
              Visit link may be down. We could not reach the site last check.
            </p>
          ) : null}

          <div className={styles.actions}>
            <a
              className={`btn ${styles.visitButton}`}
              href={withShelfRef(tool.url)}
              target="_blank"
              rel="noopener noreferrer"
              {...trackAttrs("tool_visit", {
                tool_slug: tool.slug,
                placement: "detail",
                host,
                url_status: tool.urlStatus ?? "unknown",
              })}
            >
              Visit {host}
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M6 14 14 6m-6 0h6v6" />
              </svg>
            </a>
            <div className={styles.secondaryActions}>
              <SaveButton
                slug={tool.slug}
                name={tool.name}
                placement="detail"
              />
              <ShareButton
                className={`btn btn-ghost ${styles.shareButton}`}
                title={`${tool.name} · ${SITE_NAME}`}
                text={tool.summary}
                url={`/tools/${tool.slug}`}
                surface="tool"
                toolSlug={tool.slug}
              />
            </div>
          </div>

          <ComparePeers tool={tool} peers={related} />
        </div>
      </section>

      <section className={styles.trail} aria-labelledby="trail-heading">
        <div className={styles.trailHeader}>
          <div>
            <h2 id="trail-heading">Where it showed up</h2>
          </div>
          <p className={styles.trailIntro}>
            {boardCount > 1
              ? `Posts from ${boardCount} boards, in one place.`
              : "Posts and threads that linked to this product."}
          </p>
        </div>

        {mentions.length ? (
          <ol className={styles.mentionGrid}>
            {mentions.map((mention, index) => (
              <li
                key={mention.key}
                className={styles.mention}
                data-source={mention.source}
              >
                <div className={styles.mentionTop}>
                  <span className={styles.mentionNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.mentionSource}>
                    <SourceName source={mention.source} />
                  </span>
                  <time
                    className={styles.mentionWhen}
                    dateTime={new Date(mention.createdAt).toISOString()}
                  >
                    {formatRelative(new Date(mention.createdAt))}
                  </time>
                </div>
                <h3>{mentionTitle(tool.name, mention.title)}</h3>
                <div className={styles.mentionBottom}>
                  <p className={styles.mentionStats}>
                    {scoreLabel(
                      mention.source,
                      mention.score,
                      mention.numComments,
                    )}
                  </p>
                  <a
                    className={styles.openThread}
                    href={mention.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...trackAttrs("mention_open", {
                      tool_slug: tool.slug,
                      source: mention.source,
                      href: mention.href,
                    })}
                  >
                    Open thread
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M6 14 14 6m-6 0h6v6" />
                    </svg>
                  </a>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.emptyTrail}>
            <p>No launch threads linked yet</p>
            <span>Mentions show up here as we find them across boards.</span>
          </div>
        )}
      </section>

      <RelatedTools tool={tool} related={related} />
    </main>
  );
}
