import Link from "next/link";
import type { Metadata } from "next";
import { PreviewFrame } from "@/components/preview-frame";
import { ShareButton } from "@/components/share-button";
import { SourceName } from "@/components/source-mark";
import { getCachedRelatedTools, getCachedToolBySlug } from "@/lib/db/cached";
import type { Tool } from "@/lib/db/schema";
import { cardMediaUrl } from "@/lib/enrich/media";
import { isUrlBroken } from "@/lib/enrich/url-health";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
import { trackAttrs } from "@/lib/analytics";
import {
  CATEGORY_LABELS,
  SOURCE_LABELS,
  formatRelative,
  getToolFeatures,
  hostnameFromUrl,
  withShelfRef,
} from "@/lib/utils";
import styles from "./compare.module.css";

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}): Promise<Metadata> {
  const { a, b } = await searchParams;
  const [left, right] = await Promise.all([
    a ? getCachedToolBySlug(a) : null,
    b ? getCachedToolBySlug(b) : null,
  ]);

  if (left && right) {
    const title = `${left.name} vs ${right.name}`;
    const description = `Side-by-side look at ${left.name} and ${right.name} on ${SITE_NAME}.`;
    const path = `/compare?a=${left.slug}&b=${right.slug}`;
    const image = absoluteUrl(
      `/compare/og?a=${encodeURIComponent(left.slug)}&b=${encodeURIComponent(right.slug)}`,
    );
    return {
      title,
      description,
      alternates: { canonical: path },
      openGraph: {
        title: `${title} · ${SITE_NAME}`,
        description,
        url: absoluteUrl(path),
        images: [{ url: image, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} · ${SITE_NAME}`,
        description,
        images: [image],
      },
    };
  }

  if (left) {
    const image = absoluteUrl(
      `/compare/og?a=${encodeURIComponent(left.slug)}`,
    );
    return {
      title: `Compare ${left.name}`,
      description: `Pick something from the same aisle to compare with ${left.name}.`,
      alternates: { canonical: `/compare?a=${left.slug}` },
      openGraph: {
        images: [{ url: image, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        images: [image],
      },
    };
  }

  return {
    title: "Compare tools",
    description: `Compare product-building tools side by side on ${SITE_NAME}.`,
    alternates: { canonical: "/compare" },
  };
}

function Panel({ tool }: { tool: Tool }) {
  const media = cardMediaUrl(tool);
  const accent = tool.brandColor ?? "oklch(0.42 0.08 145)";
  const host = hostnameFromUrl(tool.url);
  const broken = isUrlBroken(tool);

  return (
    <article className={`surface ${styles.panel}`}>
      <div className={styles.media} style={{ background: accent }}>
        <PreviewFrame
          src={media}
          fallback={
            <div
              className="tool-card-fallback"
              style={{
                background: `linear-gradient(160deg, ${accent} 0%, oklch(0.24 0.03 55) 100%)`,
              }}
            >
              <span className="tool-card-fallback-name">{tool.name}</span>
            </div>
          }
        />
      </div>
      <h2>{tool.name}</h2>
      <p className={styles.summary}>{tool.summary}</p>
      {broken ? <p className={styles.warn}>Visit link may be down</p> : null}
      <dl className={styles.facts}>
        <div>
          <dt>Categories</dt>
          <dd>
            <div className={styles.chips}>
              {tool.categories.map((c) => (
                <span key={c} className="tag">
                  {CATEGORY_LABELS[c] ?? c}
                </span>
              ))}
            </div>
          </dd>
        </div>
        <div>
          <dt>Boards</dt>
          <dd>
            {(tool.sources ?? []).length > 0 ? (
              <div className={styles.chips}>
                {(tool.sources ?? []).map((s) => (
                  <span key={s} className="tag">
                    <SourceName source={s} />
                  </span>
                ))}
              </div>
            ) : (
              "None yet"
            )}
          </dd>
        </div>
        <div>
          <dt>Best score</dt>
          <dd>
            {tool.scorePeak.toLocaleString()} pts
            {tool.commentsPeak > 0
              ? ` · ${tool.commentsPeak.toLocaleString()} comments`
              : ""}
          </dd>
        </div>
        <div>
          <dt>First seen</dt>
          <dd>{formatRelative(new Date(tool.firstSeenAt))}</dd>
        </div>
        <div>
          <dt>Pricing</dt>
          <dd style={{ textTransform: "capitalize" }}>{tool.pricing}</dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <a
          className="btn"
          href={withShelfRef(tool.url)}
          target="_blank"
          rel="noopener noreferrer"
          {...trackAttrs("tool_visit", {
            tool_slug: tool.slug,
            placement: "compare",
            host,
            url_status: tool.urlStatus ?? "unknown",
          })}
        >
          Visit {host}
        </a>
        <Link
          className="section-link"
          href={`/tools/${tool.slug}`}
          {...trackAttrs("compare_full_page", { tool_slug: tool.slug })}
        >
          Full page
        </Link>
      </div>
    </article>
  );
}

function PickPeer({
  left,
  peers,
}: {
  left: Tool;
  peers: Tool[];
}) {
  return (
    <section
      className={`${styles.picker} home-open`}
      aria-label="Pick a tool to compare"
    >
      <div className={styles.pickerFixed}>
        <p className={styles.pickerLabel}>Comparing</p>
        <p className={styles.pickerFixedName}>{left.name}</p>
      </div>
      <p className={styles.pickerPrompt}>Pick one to put next to it</p>
      <ul className={styles.pickerGrid}>
        {peers.map((peer) => {
          const media = cardMediaUrl(peer);
          const accent = peer.brandColor ?? "oklch(0.42 0.08 145)";
          return (
            <li key={peer.id}>
              <Link
                href={`/compare?a=${left.slug}&b=${peer.slug}`}
                className={`${styles.pickerCard} teaser-card`}
                {...trackAttrs("compare_pick", {
                  a: left.slug,
                  b: peer.slug,
                })}
              >
                <div
                  className={`${styles.pickerMedia} teaser-media`}
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
                          {peer.name}
                        </span>
                      </div>
                    }
                  />
                </div>
                <strong className="teaser-title">{peer.name}</strong>
                <span>Compare</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const [left, right] = await Promise.all([
    a ? getCachedToolBySlug(a) : null,
    b ? getCachedToolBySlug(b) : null,
  ]);

  const related = left ? await getCachedRelatedTools(left, 12) : [];

  return (
    <main id="main" className="page-stack">
      <header className="page-header">
        {left && !right && related.length > 0 ? (
          <p className="title-count">
            {related.length.toLocaleString()} peers
          </p>
        ) : left && right ? (
          <p className="title-count">2 tools</p>
        ) : null}
        <h1 className="page-title">
          {left && right
            ? `${left.name} vs ${right.name}`
            : left
              ? `Compare ${left.name}`
              : "Compare tools"}
        </h1>
        <p className="page-lede">
          {left && right
            ? "Summary, boards, and scores next to each other."
            : left
              ? "Choose another tool. You will see both side by side."
              : "Open a tool and use Compare with, under Visit."}
        </p>
        {left && right ? (
          <ShareButton
            title={`${left.name} vs ${right.name} · ${SITE_NAME}`}
            text={`Compare ${left.name} and ${right.name} on ${SITE_NAME}.`}
            url={`/compare?a=${left.slug}&b=${right.slug}`}
            className="btn"
            surface="compare"
          />
        ) : null}
      </header>

      {left && right ? (
        <>
          <div className={`${styles.grid} home-open`}>
            <Panel tool={left} />
            <Panel tool={right} />
          </div>

          <section className="home-open" aria-label="Side-by-side comparison matrix">
            <p className="section-kicker">Breakdown</p>
            <h2 className="section-title">Side-by-side Specs</h2>
            <div className={styles.matrixContainer}>
              <table className={styles.matrixTable}>
                <thead>
                  <tr>
                    <th>Feature / Metric</th>
                    <th>{left.name}</th>
                    <th>{right.name}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Key Features</strong></td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                        {getToolFeatures(left).map((feat, i) => (
                          <li key={i}>{feat}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                        {getToolFeatures(right).map((feat, i) => (
                          <li key={i}>{feat}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Categories</strong></td>
                    <td>
                      {left.categories
                        .map((c) => CATEGORY_LABELS[c] ?? c)
                        .join(", ")}
                    </td>
                    <td>
                      {right.categories
                        .map((c) => CATEGORY_LABELS[c] ?? c)
                        .join(", ")}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Community Boards</strong></td>
                    <td>
                      {left.sources
                        .map((s) => SOURCE_LABELS[s] ?? s)
                        .join(", ")}
                    </td>
                    <td>
                      {right.sources
                        .map((s) => SOURCE_LABELS[s] ?? s)
                        .join(", ")}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Peak Score</strong></td>
                    <td>{left.scorePeak.toLocaleString()} pts</td>
                    <td>{right.scorePeak.toLocaleString()} pts</td>
                  </tr>
                  <tr>
                    <td><strong>Comments & Discussion</strong></td>
                    <td>{left.commentsPeak.toLocaleString()} comments</td>
                    <td>{right.commentsPeak.toLocaleString()} comments</td>
                  </tr>
                  <tr>
                    <td><strong>First Discovered</strong></td>
                    <td>{formatRelative(new Date(left.firstSeenAt))}</td>
                    <td>{formatRelative(new Date(right.firstSeenAt))}</td>
                  </tr>
                  <tr>
                    <td><strong>Pricing Model</strong></td>
                    <td style={{ textTransform: "capitalize" }}>{left.pricing}</td>
                    <td style={{ textTransform: "capitalize" }}>{right.pricing}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {related.length > 1 ? (
            <div className="home-open">
              <p className="section-kicker">Swap the other side</p>
              <div className={styles.swap}>
                {related
                  .filter((t) => t.slug !== right.slug)
                  .slice(0, 6)
                  .map((t) => (
                    <Link
                      key={t.id}
                      href={`/compare?a=${left.slug}&b=${t.slug}`}
                      className={styles.swapChip}
                      {...trackAttrs("compare_swap", {
                        a: left.slug,
                        b: t.slug,
                        previous_b: right.slug,
                      })}
                    >
                      vs {t.name}
                    </Link>
                  ))}
              </div>
            </div>
          ) : null}
        </>
      ) : left ? (
        related.length ? (
          <PickPeer left={left} peers={related} />
        ) : (
          <div className={styles.empty}>
            <p>No close matches yet for {left.name}.</p>
            <Link
              href={`/tools/${left.slug}`}
              className="btn btn-ghost"
              {...trackAttrs("empty_cta_click", {
                cta: "back_to_tool",
                placement: "compare",
                tool_slug: left.slug,
              })}
            >
              Back to {left.name}
            </Link>
          </div>
        )
      ) : (
        <div className={styles.empty}>
          <p>Open any tool. Compare with sits under Visit.</p>
          <Link
            href="/"
            className="btn"
            {...trackAttrs("empty_cta_click", {
              cta: "browse_shelf",
              placement: "compare",
            })}
          >
            Browse the shelf
          </Link>
        </div>
      )}
    </main>
  );
}
