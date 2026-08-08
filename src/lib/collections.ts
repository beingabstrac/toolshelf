import type { Tool, ToolCategory } from "@/lib/db/schema";
import { engagementScore } from "@/lib/db/queries";

export type CollectionDef = {
  slug: string;
  title: string;
  blurb: string;
  /** Prefer tools that hit any of these categories */
  categories: ToolCategory[];
  /** Boost / require language from name + summary */
  keywords: string[];
  /** If true, at least one keyword must match */
  requireKeyword?: boolean;
};

/** Editorial aisles — curated rules, not user buckets. */
export const COLLECTIONS: CollectionDef[] = [
  {
    slug: "ai-coding",
    title: "AI coding",
    blurb: "Agents, IDEs, and copilots for writing code.",
    categories: ["ai", "dev-tools"],
    keywords: [
      "code",
      "coding",
      "ide",
      "copilot",
      "agent",
      "llm",
      "developer",
      "github",
      "refactor",
      "autocomplete",
    ],
    requireKeyword: true,
  },
  {
    slug: "design-systems",
    title: "Design systems",
    blurb: "Figma helpers, UI kits, and component libraries.",
    categories: ["design"],
    keywords: [
      "design",
      "figma",
      "ui",
      "component",
      "icon",
      "typography",
      "palette",
      "prototype",
      "wireframe",
    ],
  },
  {
    slug: "ship-faster",
    title: "Ship faster",
    blurb: "Launch pages, feedback, and no-code tools for getting out the door.",
    categories: ["product", "no-code", "marketing"],
    keywords: [
      "launch",
      "feedback",
      "waitlist",
      "landing",
      "analytics",
      "crm",
      "email",
      "seo",
      "growth",
      "no-code",
      "nocode",
    ],
  },
  {
    slug: "infra-builders",
    title: "Infra & data",
    blurb: "Databases, hosting, monitoring, and security.",
    categories: ["infra", "data", "security"],
    keywords: [
      "database",
      "deploy",
      "hosting",
      "api",
      "auth",
      "queue",
      "pipeline",
      "observability",
      "monitor",
      "security",
      "postgres",
      "redis",
    ],
  },
  {
    slug: "maker-collab",
    title: "Team collab",
    blurb: "Docs, chat, and boards for small teams.",
    categories: ["collaboration", "product"],
    keywords: [
      "collab",
      "collaboration",
      "docs",
      "notion",
      "slack",
      "meeting",
      "whiteboard",
      "kanban",
      "project",
      "team",
      "async",
    ],
    requireKeyword: true,
  },
];

export function getCollection(slug: string): CollectionDef | null {
  return COLLECTIONS.find((c) => c.slug === slug) ?? null;
}

function haystack(tool: Pick<Tool, "name" | "summary">): string {
  return `${tool.name} ${tool.summary}`.toLowerCase();
}

function keywordHits(tool: Tool, keywords: string[]): number {
  const text = haystack(tool);
  let n = 0;
  for (const k of keywords) {
    if (text.includes(k)) n += 1;
  }
  return n;
}

export function scoreForCollection(tool: Tool, def: CollectionDef): number {
  const sharedCats = tool.categories.filter((c) =>
    def.categories.includes(c as ToolCategory),
  ).length;
  const hits = keywordHits(tool, def.keywords);

  if (def.requireKeyword && hits === 0) return -1;
  if (sharedCats === 0 && hits === 0) return -1;
  if (sharedCats === 0 && hits < 2) return -1;

  return (
    sharedCats * 120 +
    Math.min(hits, 5) * 40 +
    engagementScore(tool) * 0.4
  );
}

export function getMatchingCollectionTools(
  tools: Tool[],
  def: CollectionDef,
): Tool[] {
  return tools
    .map((tool) => ({ tool, score: scoreForCollection(tool, def) }))
    .filter((row) => row.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        engagementScore(b.tool) - engagementScore(a.tool),
    )
    .map((row) => row.tool);
}

export function pickCollectionTools(
  tools: Tool[],
  def: CollectionDef,
  limit = 24,
): Tool[] {
  return getMatchingCollectionTools(tools, def).slice(0, limit);
}

export function collectionTeasers(
  tools: Tool[],
  perAisle = 3,
): { def: CollectionDef; tools: Tool[]; count: number }[] {
  return COLLECTIONS.map((def) => {
    const matched = getMatchingCollectionTools(tools, def);
    return {
      def,
      tools: matched.slice(0, perAisle),
      count: matched.length,
    };
  }).filter((row) => row.tools.length >= 2);
}

/** Rotates by ISO week number across editorial aisles. */
export function aisleOfTheWeek(date = new Date()): CollectionDef {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  const index = week % COLLECTIONS.length;
  return COLLECTIONS[index]!;
}
