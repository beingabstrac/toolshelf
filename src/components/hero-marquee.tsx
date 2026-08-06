"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Tool } from "@/lib/db/schema";
import { engagementScore } from "@/lib/db/queries";
import { trackAttrs } from "@/lib/analytics";
import { cardMediaUrl } from "@/lib/enrich/media";
import { PreviewFrame } from "./preview-frame";

function MarqueeGroup({
  tools,
  priority = false,
  inertGroup = false,
  onFail,
}: {
  tools: Tool[];
  priority?: boolean;
  inertGroup?: boolean;
  onFail: (id: number) => void;
}) {
  return (
    <div className="hero-marquee-group" aria-hidden={inertGroup || undefined}>
      {tools.map((tool, i) => (
        <Link
          key={`${tool.id}-${i}`}
          href={`/tools/${tool.slug}`}
          className="hero-marquee-card"
          tabIndex={inertGroup ? -1 : undefined}
          {...(inertGroup
            ? {}
            : trackAttrs("hero_marquee_click", {
                tool_slug: tool.slug,
                position: i + 1,
              }))}
        >
          <div
            className="hero-marquee-media"
            style={{
              background: tool.brandColor ?? "oklch(0.42 0.08 145)",
            }}
          >
            <PreviewFrame
              src={cardMediaUrl(tool)}
              priority={priority && i < 2}
              onFail={() => onFail(tool.id)}
              fallback={
                <div className="tool-card-fallback" aria-hidden="true">
                  <span className="tool-card-fallback-name">{tool.name}</span>
                </div>
              }
            />
          </div>
          <div className="hero-marquee-caption">
            <span>{String(i + 1).padStart(2, "0")}</span>
            <strong>{tool.name}</strong>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function HeroMarquee({ tools }: { tools: Tool[] }) {
  const ranked = useMemo(
    () =>
      [...tools]
        .filter((t) => cardMediaUrl(t))
        .sort((a, b) => engagementScore(b) - engagementScore(a))
        .slice(0, 12),
    [tools],
  );

  const [hidden, setHidden] = useState<Record<number, boolean>>({});
  const visible = ranked.filter((t) => !hidden[t.id]);

  if (visible.length < 3) return null;

  function hideTool(id: number) {
    setHidden((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }

  return (
    <div className="hero-marquee" aria-label="Featured products">
      <div className="hero-marquee-track">
        <MarqueeGroup tools={visible} priority onFail={hideTool} />
        <MarqueeGroup tools={visible} inertGroup onFail={hideTool} />
      </div>
    </div>
  );
}
