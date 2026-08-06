"use client";

import Link from "next/link";
import type { Tool } from "@/lib/db/schema";
import { cardMediaUrl } from "@/lib/enrich/media";
import { track, trackAttrs } from "@/lib/analytics";
import { hostnameFromUrl, withShelfRef } from "@/lib/utils";
import { PreviewFrame } from "./preview-frame";
import { SaveButton } from "./save-button";

export function ToolCard({
  tool,
  priority = false,
  placement = "shelf",
}: {
  tool: Tool;
  priority?: boolean;
  isNew?: boolean;
  placement?: string;
}) {
  const accent = tool.brandColor ?? "oklch(0.42 0.08 145)";
  const host = hostnameFromUrl(tool.url);
  const media = cardMediaUrl(tool);
  const votes = tool.scorePeak;
  const comments = tool.commentsPeak;
  const meta =
    comments > 0
      ? `${votes.toLocaleString()} pts · ${comments.toLocaleString()} comments`
      : `${votes.toLocaleString()} pts`;

  return (
    <article
      className="tool-card"
      data-shelf-card
      data-shelf-href={`/tools/${tool.slug}`}
      data-shelf-active="false"
      tabIndex={0}
      aria-label={`${tool.name}. ${tool.summary}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.key === " ") e.preventDefault();
          track("tool_card_open", {
            tool_slug: tool.slug,
            method: "keyboard",
            placement,
          });
          const main = e.currentTarget.querySelector<HTMLAnchorElement>(
            "a.tool-card-main",
          );
          main?.click();
        }
      }}
    >
      <Link
        href={`/tools/${tool.slug}`}
        className="tool-card-main"
        tabIndex={-1}
        {...trackAttrs("tool_card_open", {
          tool_slug: tool.slug,
          method: "click",
          placement,
        })}
      >
        <div className="tool-card-preview" style={{ background: accent }}>
          <PreviewFrame
            src={media}
            priority={priority}
            fallback={
              <div
                className="tool-card-fallback"
                style={{
                  background: `linear-gradient(160deg, ${accent} 0%, oklch(0.24 0.03 55) 100%)`,
                }}
                aria-hidden="true"
              >
                <span className="tool-card-fallback-name">{tool.name}</span>
              </div>
            }
          />
        </div>
        <div className="tool-card-body">
          <h2 className="tool-card-name">{tool.name}</h2>
          <p className="tool-card-summary">{tool.summary}</p>
          {tool.urlStatus === "broken" ? (
            <p className="tool-card-link-warn">Visit link may be down</p>
          ) : null}
        </div>
      </Link>
      <div className="tool-card-actions">
        <span className="tool-card-score">{meta}</span>
        <div className="tool-card-actions-end">
          <SaveButton
            slug={tool.slug}
            name={tool.name}
            compact
            placement={`card:${placement}`}
          />
          <a
            className="tool-card-visit"
            href={withShelfRef(tool.url)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${tool.name} (${host})`}
            {...trackAttrs("tool_visit", {
              tool_slug: tool.slug,
              placement: `card:${placement}`,
              host,
              url_status: tool.urlStatus ?? "unknown",
            })}
          >
            Visit
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 14 14 6m-6 0h6v6" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}
