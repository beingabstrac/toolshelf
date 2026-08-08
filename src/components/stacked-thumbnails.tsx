"use client";

import type { Tool } from "@/lib/db/schema";
import { cardMediaUrl } from "@/lib/enrich/media";
import { PreviewFrame } from "./preview-frame";
import { ToolLogo } from "./tool-logo";

export function StackedThumbnails({ tools }: { tools?: Tool[] }) {
  const topThree = (tools ?? []).slice(0, 3);

  if (topThree.length === 0) {
    return (
      <span className="command-thumb">
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: "100%",
            height: "100%",
            background: "var(--accent-soft)",
            color: "var(--accent-deep)",
            fontFamily: "var(--font-display)",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          A
        </span>
      </span>
    );
  }

  if (topThree.length === 1) {
    const tool = topThree[0]!;
    return (
      <span
        className="command-thumb"
        style={{ background: tool.brandColor ?? "oklch(0.42 0.08 145)" }}
      >
        <PreviewFrame
          src={cardMediaUrl(tool)}
          fallback={<ToolLogo tool={tool} size={20} />}
        />
      </span>
    );
  }

  // Multi-card stacked frame inside exact 3.1rem command-thumb bounding box
  const lefts = ["0%", "32%", "62%"];
  const widths = ["50%", "44%", "38%"];

  return (
    <span
      className="command-thumb"
      style={{
        position: "relative",
        width: "3.1rem",
        height: "1.75rem",
        borderRadius: "0.45rem",
        overflow: "hidden",
        display: "block",
        background: "var(--preview-frame-bg)",
        outline: "1px solid oklch(0 0 0 / 0.08)",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {topThree.map((tool, index) => {
        const media = cardMediaUrl(tool);
        const accent = tool.brandColor ?? "oklch(0.42 0.08 145)";
        return (
          <span
            key={tool.id ?? tool.slug ?? index}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: lefts[index] ?? `${index * 30}%`,
              width: widths[index] ?? "35%",
              zIndex: 3 - index,
              background: accent,
              overflow: "hidden",
              borderRight:
                index < topThree.length - 1
                  ? "1.5px solid var(--bg-elevated)"
                  : "none",
              boxShadow:
                index > 0
                  ? "-2px 0 5px oklch(0 0 0 / 0.18)"
                  : "none",
            }}
          >
            <PreviewFrame
              src={media}
              fallback={<ToolLogo tool={tool} size={14} />}
            />
          </span>
        );
      })}
    </span>
  );
}
