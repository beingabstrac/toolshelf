import { unstable_cache } from "next/cache";
import { listMentionViews } from "./mentions";
import type { Tool } from "./schema";
import {
  countTools,
  getMentionsForTool,
  getToolBySlug,
  pickRelatedTools,
  listTools,
  listToolsSeenBetween,
  resolveInclusionReason,
  type ToolSort,
} from "./queries";

const REVALIDATE = 60;

export const getCachedTools = unstable_cache(
  async (options: {
    q?: string;
    category?: string;
    sort?: ToolSort;
    limit?: number;
  }) => listTools(options),
  ["tools-list"],
  { revalidate: REVALIDATE, tags: ["tools"] },
);

export const getCachedToolCount = unstable_cache(
  async (options: { q?: string; category?: string }) => countTools(options),
  ["tools-count"],
  { revalidate: REVALIDATE, tags: ["tools"] },
);

/** Full shelf for the home directory (client filters/sorts this set). */
export const getCachedShelf = unstable_cache(
  async () =>
    listTools({
      sort: "top",
      limit: 2500,
    }),
  ["tools-shelf-top-v2"],
  { revalidate: REVALIDATE, tags: ["tools"] },
);

/** Wider shelf for editorial aisles / compare pools */
export const getCachedWideShelf = unstable_cache(
  async () =>
    listTools({
      sort: "top",
      limit: 2500,
    }),
  ["tools-shelf-wide-v2"],
  { revalidate: REVALIDATE, tags: ["tools"] },
);

export const getCachedToolBySlug = unstable_cache(
  async (slug: string) => getToolBySlug(slug),
  ["tool-by-slug"],
  { revalidate: REVALIDATE, tags: ["tools"] },
);

export const getCachedToolsSeenBetween = unstable_cache(
  async (startIso: string, endIso: string) =>
    listToolsSeenBetween(new Date(startIso), new Date(endIso), 80),
  ["tools-seen-between"],
  { revalidate: REVALIDATE, tags: ["tools"] },
);

export const getCachedMentions = unstable_cache(
  async (toolId: number) => getMentionsForTool(toolId),
  ["tool-mentions"],
  { revalidate: REVALIDATE, tags: ["tools"] },
);

export const getCachedMentionViews = unstable_cache(
  async (toolId: number) => listMentionViews(toolId),
  ["tool-mention-views"],
  { revalidate: REVALIDATE, tags: ["tools"] },
);

export const getCachedInclusionReason = unstable_cache(
  async (slug: string) => {
    const tool = await getToolBySlug(slug);
    if (!tool) return null;
    return resolveInclusionReason(tool);
  },
  ["tool-inclusion-reason"],
  { revalidate: REVALIDATE, tags: ["tools"] },
);

/** Related picks from the wide shelf cache — avoids N parallel DB hits per detail page. */
export async function getCachedRelatedTools(tool: Tool, limit = 6) {
  try {
    const shelf = await getCachedWideShelf();
    return pickRelatedTools(tool, shelf, limit);
  } catch (err) {
    console.error("related tools failed", tool.slug, err);
    return [];
  }
}
