import Link from "next/link";
import type { Tool } from "@/lib/db/schema";
import { trackAttrs } from "@/lib/analytics";
import { ToolCard } from "./tool-card";

export function ToolGrid({
  tools,
  query,
  placement = "shelf",
}: {
  tools: Tool[];
  query?: string;
  placement?: string;
  highlightNew?: boolean;
  isNew?: (tool: Tool) => boolean;
}) {
  if (!tools.length) {
    const hasQuery = Boolean(query?.trim());
    return (
      <div className="empty-state">
        <h2>{hasQuery ? `No tools for "${query}"` : "No tools on the shelf yet"}</h2>
        <p>
          {hasQuery
            ? "Try a wider search, or clear filters."
            : "New tools show up here after we add them."}
        </p>
        {hasQuery ? (
          <div className="empty-actions">
            <Link
              className="btn"
              href="/"
              {...trackAttrs("empty_cta_click", {
                cta: "clear_search",
                placement,
                query: query?.trim() || "",
              })}
            >
              Clear search
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="tool-shelf">
      <div className="tool-grid">
        {tools.map((tool, index) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            priority={index < 2}
            placement={placement}
          />
        ))}
      </div>
    </div>
  );
}
