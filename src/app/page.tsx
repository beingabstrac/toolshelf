import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Directory } from "@/components/directory";
import { HeroMarquee } from "@/components/hero-marquee";
import { JsonLd } from "@/components/json-ld";
import { AisleOfTheWeek } from "@/components/aisle-of-the-week";
import { EditorialAisles } from "@/components/editorial-aisles";
import { JustLanded } from "@/components/just-landed";
import { SavedAisle } from "@/components/saved-aisle";
import {
  DirectorySkeleton,
  HomeContentSkeleton,
} from "@/components/skeletons";
import { getCachedShelf, getCachedWideShelf } from "@/lib/db/cached";
import type { Tool } from "@/lib/db/schema";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  itemListJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import {
  buildShelfHref,
  hasSearchIntent,
  parseCategory,
  parseHideBroken,
  parseQuery,
  parseSource,
  parseSort,
} from "@/lib/url-state";
import styles from "./home.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME}: product tools from launch communities`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

async function loadShelf(): Promise<{
  tools: Tool[];
  wide: Tool[];
  dbReady: boolean;
}> {
  if (!process.env.DATABASE_URL) {
    return { tools: [], wide: [], dbReady: false };
  }

  try {
    const [tools, wide] = await Promise.all([
      getCachedShelf(),
      getCachedWideShelf().catch(() => null),
    ]);
    return { tools, wide: wide ?? tools, dbReady: true };
  } catch (err) {
    console.error("Directory load failed", err);
    return { tools: [], wide: [], dbReady: false };
  }
}

function HomeHero({ tools }: { tools?: Tool[] }) {
  return (
    <section className={styles.hero} aria-labelledby="site-title">
      <div className={styles.heroTop}>
        <div className={styles.masthead}>
          <h1 id="site-title">Toolshelf</h1>
        </div>
        <div className={styles.heroNote}>
          <p>Product tools from launch boards, easy to browse.</p>
          <a
            className={styles.heroCta}
            href="#shelf"
            data-track="hero_cta_click"
            data-track-label="Browse the shelf"
          >
            Browse the shelf
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 4v12m-5-5 5 5 5-5" />
            </svg>
          </a>
        </div>
      </div>
      {tools ? <HeroMarquee tools={tools} /> : null}
    </section>
  );
}

async function HomeBody() {
  const { tools, wide, dbReady } = await loadShelf();

  if (!dbReady) {
    return (
      <>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <HomeHero />
        <div className="empty-state">
          <h2>Database not connected</h2>
          <p>
            Add <code>DATABASE_URL</code> in <code>.env.local</code> to load the
            shelf.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd(tools.length)} />
      <JsonLd data={itemListJsonLd(tools)} />
      <HomeHero tools={tools} />
      <JustLanded tools={tools} />
      <AisleOfTheWeek tools={wide} />
      <EditorialAisles tools={wide} />
      <SavedAisle tools={tools} />
      <Suspense fallback={<DirectorySkeleton />}>
        <Directory tools={tools} />
      </Suspense>
    </>
  );
}

function HomeFallback() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <HomeHero />
      <HomeContentSkeleton />
    </>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    source?: string;
    sort?: string;
    hideBroken?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const category = parseCategory(sp.category);
  const source = parseSource(sp.source);
  const hideBroken = parseHideBroken(sp.hideBroken);
  if (hasSearchIntent({ q, category, source, hideBroken })) {
    redirect(
      buildShelfHref({
        q,
        category,
        source,
        sort: parseSort(sp.sort),
        hideBroken,
      }),
    );
  }

  return (
    <main id="main">
      <Suspense fallback={<HomeFallback />}>
        <HomeBody />
      </Suspense>
    </main>
  );
}
