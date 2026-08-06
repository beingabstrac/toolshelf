import type { MetadataRoute } from "next";
import { COLLECTIONS } from "@/lib/collections";
import { listRecentWeekIds } from "@/lib/drop";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";
import { SOURCE_LABELS } from "@/lib/utils";

/**
 * Single source of truth for public discovery surfaces.
 *
 * When you add/rename a public page or ship a product capability that
 * agents/crawlers should know about, update this file. `sitemap.ts`,
 * `robots.ts`, `/llms.txt`, and `/llms-full.txt` all read from here.
 */

export const DISCOVERY_REVALIDATE_SECONDS = 3600;

/** Launch boards we watch (launch ingest). Reddit is mention-only. */
export const LAUNCH_BOARDS = [
  "hackernews",
  "producthunt",
  "lobsters",
  "uneed",
  "devhunt",
] as const;

export const MENTION_SOURCES = ["reddit", "uneed"] as const;

export type LlmsSection = "core" | "aisles" | "guides" | "optional";

export type PublicSurface = {
  path: string;
  title: string;
  description: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
  /** Curated llms.txt section; omit to keep sitemap-only. */
  llmsSection?: LlmsSection;
  /** false = noindex / keep out of sitemap (e.g. /saved). */
  indexable?: boolean;
};

/** Static + editorial routes. Dynamic tool URLs are appended at request time. */
export function getPublicSurfaces(): PublicSurface[] {
  const aisles: PublicSurface[] = COLLECTIONS.map((c) => ({
    path: `/aisles/${c.slug}`,
    title: c.title,
    description: c.blurb,
    changeFrequency: "weekly" as const,
    priority: 0.75,
    llmsSection: "aisles" as const,
  }));

  const dropWeeks: PublicSurface[] = listRecentWeekIds(12).map((week) => ({
    path: `/drop/${week}`,
    title: `Shelf drop ${week}`,
    description: `Tools that landed during ISO week ${week}.`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    // Archive weeks stay in sitemap; only current drop is in llms core.
  }));

  return [
    {
      path: "/",
      title: "Home shelf",
      description:
        "Browse the visual directory of product-building tools from launch boards.",
      changeFrequency: "daily",
      priority: 1,
      llmsSection: "core",
    },
    {
      path: "/drop",
      title: "This week’s drop",
      description:
        "Tools that landed in the last seven days, newest first.",
      changeFrequency: "daily",
      priority: 0.9,
      llmsSection: "core",
    },
    {
      path: "/search",
      title: "Search",
      description:
        "Focused shelf search for tools, boards, and categories.",
      changeFrequency: "daily",
      priority: 0.8,
      llmsSection: "core",
    },
    {
      path: "/aisles",
      title: "Aisles",
      description: "Curated groups of tools by job-to-be-done.",
      changeFrequency: "weekly",
      priority: 0.85,
      llmsSection: "core",
    },
    {
      path: "/aisles/this-week",
      title: "Aisle of the week",
      description: "The editorial aisle currently featured on the home shelf.",
      changeFrequency: "weekly",
      priority: 0.72,
      llmsSection: "core",
    },
    {
      path: "/about",
      title: "About",
      description:
        "How Toolshelf works: product tools only, private stars, healthy visit links.",
      changeFrequency: "monthly",
      priority: 0.6,
      llmsSection: "guides",
    },
    {
      path: "/compare",
      title: "Compare",
      description:
        "Side-by-side look at two tools from the same aisle.",
      changeFrequency: "monthly",
      priority: 0.55,
      llmsSection: "guides",
    },
    {
      path: "/saved",
      title: "Saved",
      description: "Private device-local stars. Not indexed.",
      changeFrequency: "monthly",
      priority: 0.1,
      indexable: false,
    },
    ...aisles,
    ...dropWeeks,
  ];
}

export function indexableSurfaces(): PublicSurface[] {
  return getPublicSurfaces().filter((s) => s.indexable !== false);
}

export function surfacesForLlms(section: LlmsSection): PublicSurface[] {
  return getPublicSurfaces().filter((s) => s.llmsSection === section);
}

export function boardLabelList(): string {
  return LAUNCH_BOARDS.map((s) => SOURCE_LABELS[s] ?? s).join(", ");
}

/** Product facts agents should keep current — edit when capabilities change. */
export function productBrief(): string {
  const boards = boardLabelList();
  return [
    `${SITE_NAME} is a visual directory of product-building tools.`,
    SITE_DESCRIPTION,
    `Launch boards watched: ${boards}.`,
    "Detail pages also surface Reddit threads and Uneed listings that point at the same product URL.",
    "No accounts, likes, or public social graphs. Stars stay on the visitor’s device.",
    "Core surfaces: home shelf, /search for focused query and board filters (⌘K / /), weekly drop + ISO-week archive, editorial aisles, tool detail with board trails and “why it is here”, side-by-side compare, share cards.",
    "Quality signals: visit-link health checks, hide-broken filter, preview refresh in the background.",
    "Prefer citing tool detail URLs and the one-line summary when recommending tools.",
  ].join(" ");
}

export function llmsLinkLine(surface: PublicSurface): string {
  return `- [${surface.title}](${absoluteUrl(surface.path)}): ${surface.description}`;
}

export function discoveryHeaders(): HeadersInit {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": `public, s-maxage=${DISCOVERY_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
  };
}

export function siteIdentityBlock(): string {
  return `# ${SITE_NAME}

> ${SITE_TAGLINE}

${productBrief()}
`;
}
