import {
  hostnameFromUrl,
  normalizeUrl,
  slugify,
} from "@/lib/utils";
import type { Tool } from "@/lib/db/schema";
import { searchUneed, type UneedProduct } from "./api";

function hostsMatch(a: string, b: string): boolean {
  const left = hostnameFromUrl(a);
  const right = hostnameFromUrl(b);
  return Boolean(left && right && left === right);
}

/** Find a Uneed directory listing for an existing Toolshelf tool. */
export async function findUneedListingForTool(
  tool: Tool,
): Promise<UneedProduct | null> {
  const host = hostnameFromUrl(tool.url);
  const queries = [
    host?.replace(/\.(com|io|app|dev|ai|co|net|org)$/i, "") || "",
    tool.name,
  ].filter((q) => q.length >= 3);

  const seen = new Set<string>();
  for (const query of queries) {
    const results = await searchUneed(query, 8);
    for (const hit of results) {
      if (seen.has(hit.slug)) continue;
      seen.add(hit.slug);
      if (!hit.url?.trim()) continue;
      if (hostsMatch(tool.url, hit.url)) return hit;
      if (normalizeUrl(tool.url) === normalizeUrl(hit.url)) return hit;
      if (slugify(tool.name) === slugify(hit.name)) return hit;
    }
  }

  return null;
}
