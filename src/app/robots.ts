import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

/**
 * Crawl policy for search + AI answer engines (GEO / AEO).
 * Discovery index for agents lives at /llms.txt (linked from HTML + that file).
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  const disallow = ["/api/", "/saved"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      // Explicit allow for major AI crawlers (same policy, clear intent).
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow,
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow,
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow,
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow,
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow,
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow,
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow,
      },
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
