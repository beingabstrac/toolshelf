import {
  SOURCES,
  TOOL_CATEGORIES,
  type Source,
  type ToolCategory,
} from "@/lib/db/schema";
import type { ToolSort } from "@/lib/db/queries";

const SORTS: ToolSort[] = ["top", "discussed", "newest"];

export function parseCategory(value: string | null | undefined): string {
  if (!value) return "";
  return (TOOL_CATEGORIES as readonly string[]).includes(value)
    ? value
    : "";
}

export function parseSource(value: string | null | undefined): Source | "" {
  if (!value) return "";
  return (SOURCES as readonly string[]).includes(value)
    ? (value as Source)
    : "";
}

export function parseSort(value: string | null | undefined): ToolSort {
  if (value && (SORTS as string[]).includes(value)) {
    return value as ToolSort;
  }
  return "top";
}

export function parseQuery(value: string | null | undefined): string {
  return value?.trim() ? value : "";
}

export function parseHideBroken(value: string | null | undefined): boolean {
  return value === "1" || value === "true";
}

/** True when URL params mean a focused search/filter view (not home browse). */
export function hasSearchIntent(next: {
  q?: string;
  category?: string;
  source?: string;
  hideBroken?: boolean;
}): boolean {
  return Boolean(
    next.q?.trim() ||
      parseCategory(next.category) ||
      parseSource(next.source) ||
      next.hideBroken,
  );
}

/**
 * Shelf filter URLs.
 * Search intent → `/search?...` (focused page).
 * Sort-only / empty → `/` or `/search` depending on `basePath`.
 */
export function buildShelfHref(
  next: {
    q?: string;
    category?: string;
    source?: string;
    sort?: ToolSort;
    hideBroken?: boolean;
  },
  basePath: "/" | "/search" = "/search",
): string {
  const sp = new URLSearchParams();
  const q = next.q?.trim();
  const category = parseCategory(next.category);
  const source = parseSource(next.source);
  const sort = parseSort(next.sort);
  const hideBroken = Boolean(next.hideBroken);

  if (q) sp.set("q", q);
  if (category) sp.set("category", category);
  if (source) sp.set("source", source);
  if (sort !== "top") sp.set("sort", sort);
  if (hideBroken) sp.set("hideBroken", "1");

  const intent = hasSearchIntent({ q, category, source, hideBroken });
  const path = intent ? "/search" : basePath;
  const s = sp.toString();
  return s ? `${path}?${s}` : path;
}

export type { ToolCategory };
