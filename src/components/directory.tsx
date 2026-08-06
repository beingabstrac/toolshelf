"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type Tool } from "@/lib/db/schema";
import { engagementScore, type ToolSort } from "@/lib/db/queries";
import { scoreTool } from "@/lib/command-search";
import { track } from "@/lib/analytics";
import {
  buildShelfHref,
  parseCategory,
  parseHideBroken,
  parseQuery,
  parseSort,
  parseSource,
} from "@/lib/url-state";
import { CATEGORY_LABELS, SOURCE_LABELS, cn } from "@/lib/utils";
import { ShelfKeyboard } from "./shelf-keyboard";
import { ToolGrid } from "./tool-grid";

const SORTS: { id: ToolSort; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "discussed", label: "Discussed" },
  { id: "newest", label: "Newest" },
];

/** Client-only windowing — shelf data is already in memory. */
const PAGE_SIZE = 48;
const LOAD_MORE = 48;

export function Directory({
  tools,
  basePath = "/",
  variant = "home",
}: {
  tools: Tool[];
  basePath?: "/" | "/search";
  variant?: "home" | "search";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlCategory = parseCategory(searchParams.get("category"));
  const urlSource = parseSource(searchParams.get("source"));
  const urlSort = parseSort(searchParams.get("sort"));
  const urlQ = parseQuery(searchParams.get("q"));
  const urlHideBroken = parseHideBroken(searchParams.get("hideBroken"));

  const [category, setCategory] = useState(urlCategory);
  const [source, setSource] = useState(urlSource);
  const [sort, setSort] = useState(urlSort);
  const [q, setQ] = useState(urlQ);
  const [hideBroken, setHideBroken] = useState(urlHideBroken);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const urlSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCategory(urlCategory);
    setSource(urlSource);
    setSort(urlSort);
    setQ(urlQ);
    setHideBroken(urlHideBroken);
  }, [urlCategory, urlSource, urlSort, urlQ, urlHideBroken]);

  function syncUrl(next: {
    q?: string;
    category?: string;
    source?: string;
    sort?: ToolSort;
    hideBroken?: boolean;
  }) {
    const href = buildShelfHref(
      {
        q: next.q ?? q,
        category: next.category === undefined ? category : next.category,
        source: next.source === undefined ? source : next.source,
        sort: next.sort ?? sort,
        hideBroken:
          next.hideBroken === undefined ? hideBroken : next.hideBroken,
      },
      basePath,
    );
    if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current);
    urlSyncTimer.current = setTimeout(() => {
      router.replace(href, { scroll: false });
    }, 120);
  }

  useEffect(() => {
    return () => {
      if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    let next = tools.filter((tool) => {
      if (hideBroken && tool.urlStatus === "broken") return false;
      if (category && !tool.categories.includes(category)) return false;
      if (source && !(tool.sources ?? []).includes(source)) return false;
      if (!needle) return true;
      return scoreTool(tool, needle) > 0;
    });

    const healthyRank = (t: Tool) => (t.urlStatus === "broken" ? 1 : 0);
    const relevance = (t: Tool) => (needle ? scoreTool(t, needle) : 0);

    if (sort === "discussed") {
      next = [...next].sort(
        (a, b) =>
          healthyRank(a) - healthyRank(b) ||
          relevance(b) - relevance(a) ||
          b.commentsPeak - a.commentsPeak ||
          engagementScore(b) - engagementScore(a),
      );
    } else if (sort === "newest") {
      next = [...next].sort(
        (a, b) =>
          healthyRank(a) - healthyRank(b) ||
          relevance(b) - relevance(a) ||
          new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
      );
    } else {
      next = [...next].sort(
        (a, b) =>
          healthyRank(a) - healthyRank(b) ||
          relevance(b) - relevance(a) ||
          engagementScore(b) - engagementScore(a),
      );
    }

    return next;
  }, [tools, q, category, source, sort, hideBroken]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, category, source, sort, hideBroken]);

  useEffect(() => {
    const current = parseQuery(searchParams.get("q"));
    if (q.trim() === current) return;
    syncUrl({ q });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync q only
  }, [q]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = loadMoreRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisibleCount((n) => {
          const next = n + LOAD_MORE;
          track("shelf_load_more", {
            method: "intersection",
            variant,
            visible_count: next,
            remaining: Math.max(filtered.length - next, 0),
          });
          return next;
        });
      },
      { rootMargin: "480px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visibleCount, filtered.length, variant]);

  const activeBits = [
    source ? SOURCE_LABELS[source] ?? source : null,
    category ? CATEGORY_LABELS[category] ?? category : null,
    hideBroken ? "hiding down links" : null,
    q.trim() ? `“${q.trim()}”` : null,
  ].filter(Boolean) as string[];

  const search = variant === "search";
  const searchTitle = q.trim()
    ? q.trim()
    : source
      ? (SOURCE_LABELS[source] ?? source)
      : category
        ? (CATEGORY_LABELS[category] ?? category)
        : "Search";

  function clearFilters() {
    track("shelf_filters_clear", {
      variant,
      had_q: Boolean(q.trim()),
      had_category: Boolean(category),
      had_source: Boolean(source),
      had_hide_broken: hideBroken,
    });
    setCategory("");
    setSource("");
    setHideBroken(false);
    setQ("");
    syncUrl({
      category: "",
      source: "",
      hideBroken: false,
      q: "",
    });
  }

  return (
    <section
      id="shelf"
      className={cn("directory", search ? "directory-search" : "home-band")}
      aria-labelledby="shelf-heading"
    >
      {search ? (
        <header className="page-header search-header">
          <div className="search-header-meta">
            <p className="title-count" aria-live="polite">
              {filtered.length.toLocaleString()} tools
            </p>
            {activeBits.length ? (
              <button
                type="button"
                className="shelf-clear"
                onClick={clearFilters}
              >
                Clear
              </button>
            ) : null}
          </div>
          <h1 id="shelf-heading" className="page-title">
            {searchTitle}
          </h1>
        </header>
      ) : (
        <>
          <div className="section-head directory-head">
            <div className="directory-heading">
              <p className="title-count" aria-live="polite">
                {filtered.length.toLocaleString()} tools
              </p>
              <h2 id="shelf-heading" className="section-title">
                The shelf
              </h2>
            </div>

            <div className="sort-row" role="group" aria-label="Sort tools">
              {SORTS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className={cn("sort-link", sort === s.id && "sort-active")}
                  aria-pressed={sort === s.id}
                  onClick={() => {
                    track("shelf_sort_change", {
                      sort: s.id,
                      previous_sort: sort,
                      variant,
                    });
                    setSort(s.id);
                    syncUrl({ sort: s.id });
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {activeBits.length ? (
            <p className="shelf-active">
              <span>Showing {activeBits.join(" · ")}</span>
              <button
                type="button"
                className="shelf-clear"
                onClick={clearFilters}
              >
                Clear
              </button>
            </p>
          ) : null}
        </>
      )}

      <ShelfKeyboard cardCount={visible.length} />
      <ToolGrid tools={visible} query={q} placement={variant} />

      {hasMore ? (
        <div className="load-more" ref={loadMoreRef}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setVisibleCount((n) => {
                const next = n + LOAD_MORE;
                track("shelf_load_more", {
                  method: "click",
                  variant,
                  visible_count: next,
                  remaining: Math.max(filtered.length - next, 0),
                });
                return next;
              });
            }}
          >
            Load more
            <span className="load-more-count">
              {filtered.length - visibleCount} left
            </span>
          </button>
        </div>
      ) : null}
    </section>
  );
}
