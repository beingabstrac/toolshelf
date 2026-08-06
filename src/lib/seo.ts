import type { Metadata } from "next";
import type { Tool } from "@/lib/db/schema";
import { CATEGORY_LABELS, hostnameFromUrl } from "@/lib/utils";
import { cardMediaUrl } from "@/lib/enrich/media";

export const SITE_NAME = "Toolshelf";

export const SITE_TAGLINE =
  "Product tools from launch boards, easy to browse.";

export const SITE_DESCRIPTION =
  "A visual directory of product tools from Hacker News, Product Hunt, Lobsters, Uneed, and DevHunt. See what shipped, what it does, and how it looks.";

/** Canonical site origin for metadata, sitemap, and structured data. */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production.replace(/\/$/, "")}`;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function defaultMetadata(): Metadata {
  const url = getSiteUrl();
  return {
    metadataBase: new URL(url),
    title: {
      default: `${SITE_NAME}: product tools from launch communities`,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    keywords: [
      "product tools",
      "developer tools",
      "SaaS directory",
      "Hacker News tools",
      "Product Hunt",
      "Lobsters",
      "Uneed",
      "DevHunt",
      "startup launches",
      "builder tools",
    ],
    alternates: {
      canonical: "/",
      types: {
        "application/rss+xml": [
          { url: "/feed.xml", title: `${SITE_NAME} RSS` },
        ],
        "text/plain": [
          { url: "/llms.txt", title: "llms.txt" },
          { url: "/llms-full.txt", title: "llms-full.txt" },
        ],
      },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      siteName: SITE_NAME,
      title: `${SITE_NAME}: product tools from launch communities`,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME}: product tools from launch communities`,
      description: SITE_DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    category: "technology",
    other: {
      "llms-txt": absoluteUrl("/llms.txt"),
    },
  };
}

export function toolPageDescription(tool: Tool): string {
  const summary = tool.summary?.trim();
  if (summary) {
    return summary.length > 160 ? `${summary.slice(0, 157)}…` : summary;
  }
  return `${tool.name} is a product-building tool listed on ${SITE_NAME}.`;
}

export function toolMetadata(tool: Tool): Metadata {
  const title = tool.name;
  const description = toolPageDescription(tool);
  const path = `/tools/${tool.slug}`;
  const url = absoluteUrl(path);

  // Let /tools/[slug]/opengraph-image provide the brand share card
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: `${tool.name} · ${SITE_NAME}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.name} · ${SITE_NAME}`,
      description,
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: getSiteUrl(),
    description: SITE_DESCRIPTION,
    foundingDate: "2026",
  };
}

export function websiteJsonLd(toolCount?: number) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: getSiteUrl(),
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
    ...(typeof toolCount === "number"
      ? {
          about: {
            "@type": "ItemList",
            name: "Product-building tools",
            numberOfItems: toolCount,
          },
        }
      : {}),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getSiteUrl()}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function itemListJsonLd(
  tools: Array<Pick<Tool, "name" | "slug" | "summary">>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} directory`,
    description: SITE_DESCRIPTION,
    numberOfItems: tools.length,
    itemListElement: tools.slice(0, 48).map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/tools/${tool.slug}`),
      name: tool.name,
      ...(tool.summary ? { description: tool.summary } : {}),
    })),
  };
}

export function softwareApplicationJsonLd(tool: Tool) {
  const image = cardMediaUrl(tool);
  const categories = (tool.categories ?? [])
    .map((c) => CATEGORY_LABELS[c] ?? c)
    .filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.summary || toolPageDescription(tool),
    url: absoluteUrl(`/tools/${tool.slug}`),
    applicationCategory: categories[0] || "BusinessApplication",
    operatingSystem: "Web",
    ...(image ? { image } : {}),
    ...(tool.url ? { sameAs: [tool.url], downloadUrl: tool.url } : {}),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
    mainEntityOfPage: absoluteUrl(`/tools/${tool.slug}`),
    ...(hostnameFromUrl(tool.url)
      ? {
          provider: {
            "@type": "Organization",
            name: tool.name,
            url: tool.url,
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(tool: Tool) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: getSiteUrl(),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: tool.name,
        item: absoluteUrl(`/tools/${tool.slug}`),
      },
    ],
  };
}
