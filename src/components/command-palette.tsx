"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { SOURCES, type Tool } from "@/lib/db/schema";
import { COLLECTIONS, pickCollectionTools } from "@/lib/collections";
import {
  rankByEngagement,
  scoreText,
  scoreTool,
  splitHighlight,
  type CommandHit,
  type CommandKind,
} from "@/lib/command-search";
import { track } from "@/lib/analytics";
import { cardMediaUrl } from "@/lib/enrich/media";
import { buildShelfHref } from "@/lib/url-state";
import { SOURCE_LABELS, cn } from "@/lib/utils";
import { PreviewFrame } from "./preview-frame";
import { SourceMark } from "./source-mark";
import { StackedThumbnails } from "./stacked-thumbnails";
import { ToolLogo } from "./tool-logo";

const NAV: CommandHit[] = [
  {
    id: "nav-shelf",
    label: "The shelf",
    href: "/#shelf",
    hint: "Browse every tool",
    kind: "nav",
    score: 0,
  },
  {
    id: "nav-drop",
    label: "This week’s drop",
    href: "/drop",
    hint: "What landed in the last seven days",
    kind: "nav",
    score: 0,
  },
  {
    id: "nav-aisles",
    label: "All aisles",
    href: "/aisles",
    hint: "Curated groups",
    kind: "nav",
    score: 0,
  },
  {
    id: "nav-aisle-week",
    label: "Aisle of the week",
    href: "/aisles/this-week",
    hint: "Editor’s pick",
    kind: "nav",
    score: 0,
  },
  {
    id: "nav-saved",
    label: "Saved",
    href: "/saved",
    hint: "Stars on this device",
    kind: "nav",
    score: 0,
  },
  {
    id: "nav-about",
    label: "About",
    href: "/about",
    hint: "How the shelf works",
    kind: "nav",
    score: 0,
  },
];

const FILTERS: CommandHit[] = [
  {
    id: "filter-hide-broken",
    label: "Hide broken / offline tools",
    href: buildShelfHref({ hideBroken: true }),
    hint: "Only show tools with active, working websites",
    kind: "filter",
    score: 0,
  },
  ...SOURCES.map((source) => ({
    id: `filter-board-${source}`,
    label: `${SOURCE_LABELS[source] ?? source}`,
    href: buildShelfHref({ source }),
    hint: "Board search",
    kind: "filter" as const,
    score: 0,
    source,
  })),
];

const KIND_ORDER: CommandKind[] = ["action", "tool", "aisle", "nav", "filter"];

const KIND_LABEL: Record<CommandKind, string> = {
  action: "On the shelf",
  tool: "Tools",
  aisle: "Aisles",
  nav: "Go to",
  filter: "Filters",
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

function Highlight({ text, needle }: { text: string; needle: string }) {
  const parts = splitHighlight(text, needle);
  return (
    <>
      {parts.map((part, i) =>
        part.hit ? (
          <mark key={i} className="command-mark">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function CommandPalette({ tools }: { tools: Tool[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const close = useCallback((method: string = "unknown") => {
    setOpen((wasOpen) => {
      if (wasOpen) track("palette_close", { method });
      return false;
    });
    setQ("");
    setActive(0);
  }, []);

  const openPalette = useCallback((method: string = "unknown") => {
    setOpen(true);
    setActive(0);
    track("palette_open", { method });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const metaK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (metaK) {
        e.preventDefault();
        setOpen((v) => {
          if (v) {
            track("palette_close", { method: "mod_k" });
            return false;
          }
          track("palette_open", { method: "mod_k" });
          return true;
        });
        return;
      }

      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        openPalette("slash");
        return;
      }

      if (e.key === "Escape" && open) {
        e.preventDefault();
        close("esc");
      }
    }

    function onCommandEvent() {
      openPalette("shelf_keyboard");
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("toolshelf:command", onCommandEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("toolshelf:command", onCommandEvent);
    };
  }, [close, open, openPalette]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const aisleItems: CommandHit[] = useMemo(
    () =>
      COLLECTIONS.map((c) => {
        const aisleTools = pickCollectionTools(tools, c, 3);
        const topTool = aisleTools[0];
        return {
          id: `aisle-${c.slug}`,
          label: c.title,
          href: `/aisles/${c.slug}`,
          hint: c.blurb,
          kind: "aisle" as const,
          score: 0,
          preview: topTool ? cardMediaUrl(topTool) : null,
          accent: topTool?.brandColor ?? null,
          aisleTools,
        };
      }),
    [tools],
  );

  const hotTools = useMemo(
    () =>
      rankByEngagement(tools, 6).map((t) => ({
        id: `hot-${t.slug}`,
        label: t.name,
        href: `/tools/${t.slug}`,
        hint: t.summary,
        kind: "tool" as const,
        score: 0,
        preview: cardMediaUrl(t),
        accent: t.brandColor,
      })),
    [tools],
  );

  const items = useMemo(() => {
    const needle = q.trim();
    if (!needle) {
      return [...NAV, ...aisleItems, ...FILTERS, ...hotTools];
    }

    const lower = needle.toLowerCase();
    const hits: CommandHit[] = [];

    hits.push({
      id: "action-shelf-q",
      label: `Search “${needle}”`,
      href: buildShelfHref({ q: needle }),
      hint: "Open results page",
      kind: "action",
      score: 10_000,
    });

    for (const item of [...NAV, ...FILTERS, ...aisleItems]) {
      const score = scoreText(item.label, item.hint, lower);
      if (score > 0) hits.push({ ...item, score });
    }

    for (const tool of tools) {
      const score = scoreTool(tool, lower);
      if (score <= 0) continue;
      hits.push({
        id: `tool-${tool.slug}`,
        label: tool.name,
        href: `/tools/${tool.slug}`,
        hint: tool.summary,
        kind: "tool",
        score,
        preview: cardMediaUrl(tool),
        accent: tool.brandColor,
        logoUrl: tool.logoUrl,
        url: tool.url,
      });
    }

    hits.sort((a, b) => {
      const kindDelta =
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
      if (kindDelta !== 0) return kindDelta;
      return b.score - a.score || a.label.localeCompare(b.label);
    });

    const capped: CommandHit[] = [];
    const kindCount: Partial<Record<CommandKind, number>> = {};
    for (const hit of hits) {
      const used = kindCount[hit.kind] ?? 0;
      const max =
        hit.kind === "tool" ? 10 : hit.kind === "action" ? 1 : 4;
      if (used >= max) continue;
      kindCount[hit.kind] = used + 1;
      capped.push(hit);
      if (capped.length >= 18) break;
    }
    return capped;
  }, [q, tools, aisleItems, hotTools]);

  const flatIndex = useMemo(() => {
    // Map visual rows (including headers) aren't needed — active indexes items only
    return items;
  }, [items]);

  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setActive(0);
  }

  useEffect(() => {
    if (!open) return;
    const root = listRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-cmd-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open, items]);

  function go(item: CommandHit, method: "click" | "enter") {
    track("palette_select", {
      kind: item.kind,
      label: item.label,
      href: item.href,
      query: q.trim(),
      method,
    });
    close("navigate");
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(flatIndex.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatIndex[active];
      if (item) go(item, "enter");
    }
  }

  useEffect(() => {
    if (!open) return;
    const needle = q.trim();
    if (!needle) return;
    const t = window.setTimeout(() => {
      track("palette_query", {
        query: needle,
        query_len: needle.length,
        result_count: items.length,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [q, open, items.length]);

  const grouped = useMemo(() => {
    const groups: { kind: CommandKind; rows: CommandHit[] }[] = [];
    for (const kind of KIND_ORDER) {
      const rows = items.filter((item) => item.kind === kind);
      if (rows.length) groups.push({ kind, rows });
    }
    return groups;
  }, [items]);

  let runningIndex = -1;

  return (
    <>
      <button
        type="button"
        className="site-nav-link command-trigger"
        onClick={() => openPalette("button")}
        aria-haspopup="dialog"
        aria-expanded={open}
        {...{ "data-track": "nav_click", "data-track-label": "Search" }}
      >
        Search
        <kbd className="command-kbd">⌘K</kbd>
      </button>

      {open ? (
        <div
          className="command-root"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close("backdrop");
          }}
        >
          <div
            className="command-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search Toolshelf"
          >
            <div className="command-input-row">
              <svg
                className="command-search-icon"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <circle
                  cx="8.5"
                  cy="8.5"
                  r="5.25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M12.5 12.5 16.5 16.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              <input
                ref={inputRef}
                className="command-input"
                placeholder="Tool, aisle, board, or idea"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                aria-controls={listId}
                aria-autocomplete="list"
                autoComplete="off"
                spellCheck={false}
              />
              {q ? (
                <button
                  type="button"
                  className="command-clear"
                  onClick={() => setQ("")}
                  aria-label="Clear search"
                >
                  Clear
                </button>
              ) : (
                <kbd className="command-kbd command-kbd-esc">esc</kbd>
              )}
            </div>

            <ul id={listId} ref={listRef} className="command-list" role="listbox">
              {items.length === 0 ? (
                <li className="command-empty">
                  <strong>Nothing matches</strong>
                  <span>Try a shorter word, a board name, or an aisle.</span>
                </li>
              ) : (
                grouped.map((group) => (
                  <li key={group.kind} className="command-group" role="presentation">
                    <p className="command-group-label">{KIND_LABEL[group.kind]}</p>
                    <ul className="command-group-list" role="group">
                      {group.rows.map((item) => {
                        runningIndex += 1;
                        const index = runningIndex;
                        const isTool = item.kind === "tool";
                        return (
                          <li
                            key={item.id}
                            role="option"
                            aria-selected={index === active}
                          >
                            <button
                              type="button"
                              data-cmd-index={index}
                              className={cn(
                                "command-item",
                                isTool && "command-item-tool",
                                item.kind === "aisle" && "command-item-aisle",
                                index === active && "command-item-active",
                              )}
                              onMouseEnter={() => setActive(index)}
                              onClick={() => go(item, "click")}
                            >
                              {isTool ? (
                                <span
                                  className="command-thumb"
                                  style={{
                                    background:
                                      item.accent ?? "oklch(0.42 0.08 145)",
                                  }}
                                  aria-hidden="true"
                                >
                                  <PreviewFrame
                                    src={item.preview}
                                    fallback={
                                      <ToolLogo
                                        tool={{
                                          name: item.label,
                                          url: item.url || "",
                                          logoUrl: item.logoUrl,
                                          brandColor: item.accent,
                                        }}
                                        size={24}
                                      />
                                    }
                                  />
                                </span>
                              ) : item.kind === "aisle" ? (
                                <StackedThumbnails tools={item.aisleTools} />
                              ) : item.source ? (
                                <span
                                  className="command-kind"
                                  style={{
                                    background: "var(--bg-elevated)",
                                    border: "1px solid var(--line)",
                                  }}
                                  aria-hidden="true"
                                >
                                  <SourceMark source={item.source} />
                                </span>
                              ) : item.kind === "nav" ? (
                                <span
                                  className="command-kind"
                                  style={{
                                    background: "var(--accent-soft)",
                                    color: "var(--accent-deep)",
                                    fontFamily: "var(--font-display)",
                                    fontSize: "0.95rem",
                                    fontWeight: 400,
                                  }}
                                  aria-hidden="true"
                                >
                                  T
                                </span>
                              ) : item.id === "filter-hide-broken" ? (
                                <span
                                  className="command-kind"
                                  style={{
                                    background: "var(--accent-soft)",
                                    color: "var(--accent-deep)",
                                  }}
                                  aria-hidden="true"
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                  </svg>
                                </span>
                              ) : (
                                <span
                                  className={cn(
                                    "command-kind",
                                    `command-kind-${item.kind}`,
                                  )}
                                  aria-hidden="true"
                                >
                                  {item.kind === "action" ? "→" : "F"}
                                </span>
                              )}
                              <span className="command-item-copy">
                                <span className="command-item-label">
                                  <Highlight text={item.label} needle={q} />
                                </span>
                                <span className="command-item-hint">
                                  {item.hint}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))
              )}
            </ul>

            <div className="command-footer">
              <span>
                <kbd className="command-kbd">↑</kbd>
                <kbd className="command-kbd">↓</kbd>
                move
              </span>
              <span>
                <kbd className="command-kbd">↵</kbd>
                open
              </span>
              <span>
                <kbd className="command-kbd">/</kbd>
                or
                <kbd className="command-kbd">⌘K</kbd>
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
