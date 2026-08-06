import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SourceName } from "@/components/source-mark";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  organizationJsonLd,
} from "@/lib/seo";
import { trackAttrs } from "@/lib/analytics";
import { buildShelfHref } from "@/lib/url-state";
import styles from "./about.module.css";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About · ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/about"),
  },
};

const BOARDS = [
  { label: "Hacker News", source: "hackernews" },
  { label: "Product Hunt", source: "producthunt" },
  { label: "Lobsters", source: "lobsters" },
  { label: "Uneed", source: "uneed" },
  { label: "DevHunt", source: "devhunt" },
] as const;

export default function AboutPage() {
  return (
    <main id="main" className={styles.page}>
      <JsonLd data={organizationJsonLd()} />
      <section className={styles.hero} aria-labelledby="about-title">
        <p className={styles.kicker}>No accounts · No likes · No noise</p>
        <h1 id="about-title" className={styles.title}>
          The visual layer launch boards never had
        </h1>
        <p className={styles.lede}>
          Toolshelf turns product launches into a skimmable shelf. See what
          shipped, what it does, and how it looks, without digging through
          threads.
        </p>
        <div className={styles.ctaRow}>
          <Link className="btn" href="/#shelf" {...trackAttrs("about_cta_click", { cta: "shelf" })}>
            Open the shelf
          </Link>
          <Link className="btn btn-ghost" href="/drop" {...trackAttrs("about_cta_click", { cta: "drop" })}>
            This week’s drop
          </Link>
        </div>
      </section>

      <section
        className={`${styles.boards} home-band`}
        aria-labelledby="sources-heading"
      >
        <div className="section-heading">
          <p className="title-count">5 boards</p>
          <h2 id="sources-heading" className="section-title">
            Where tools come from
          </h2>
        </div>
        <ul className={styles.boardRow}>
          {BOARDS.map((board) => (
            <li key={board.source}>
              <Link
                href={buildShelfHref({ source: board.source })}
                className={styles.boardChip}
                {...trackAttrs("about_board_click", { source: board.source })}
              >
                <SourceName source={board.source} label={board.label} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ul className={`${styles.principles} home-open`}>
        <li className={styles.principle}>
          <p className={styles.principleIndex}>01</p>
          <h2>Product tools only</h2>
          <p>
            AI keeps builders’ tools and drops essays, news, and one-off demos.
            Same product URL becomes one card, with every board trail underneath.
          </p>
        </li>
        <li className={styles.principle}>
          <p className={styles.principleIndex}>02</p>
          <h2>Private by default</h2>
          <p>
            Stars stay on this device. There are no accounts, likes, or public
            lists. Saved is only yours.
          </p>
        </li>
        <li className={styles.principle}>
          <p className={styles.principleIndex}>03</p>
          <h2>A healthy shelf</h2>
          <p>
            We check visit links and demote ones that look down. Missing
            previews refresh in the background so the gallery stays scannable.
          </p>
        </li>
      </ul>

      <section
        className={`${styles.machine} home-band`}
        aria-labelledby="machine-heading"
      >
        <div className="section-heading">
          <p className="title-count">For agents & crawlers</p>
          <h2 id="machine-heading" className="section-title">
            Machine indexes
          </h2>
        </div>
        <p className={styles.machineLede}>
          These stay generated from the live shelf so search engines and AI
          agents see what exists today.
        </p>
        <ul className={styles.machineList}>
          <li>
            <a href="/llms.txt" {...trackAttrs("about_index_click", { href: "/llms.txt", label: "llms.txt" })}>llms.txt</a>
            <span>Curated site brief for LLM agents</span>
          </li>
          <li>
            <a href="/llms-full.txt" {...trackAttrs("about_index_click", { href: "/llms-full.txt", label: "llms-full.txt" })}>llms-full.txt</a>
            <span>Expanded context when agents need more</span>
          </li>
          <li>
            <a href="/sitemap.xml" {...trackAttrs("about_index_click", { href: "/sitemap.xml", label: "sitemap.xml" })}>sitemap.xml</a>
            <span>Every indexable URL</span>
          </li>
          <li>
            <a href="/robots.txt" {...trackAttrs("about_index_click", { href: "/robots.txt", label: "robots.txt" })}>robots.txt</a>
            <span>Crawl policy for search and AI bots</span>
          </li>
          <li>
            <a href="/feed.xml" {...trackAttrs("about_index_click", { href: "/feed.xml", label: "feed.xml" })}>feed.xml</a>
            <span>RSS of this week’s drop and new tools</span>
          </li>
        </ul>
      </section>
    </main>
  );
}
