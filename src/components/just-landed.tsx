import Link from "next/link";
import type { Tool } from "@/lib/db/schema";
import { trackAttrs } from "@/lib/analytics";
import { pickWeeklyDrop } from "@/lib/drop";
import { cardMediaUrl } from "@/lib/enrich/media";
import { PreviewFrame } from "./preview-frame";

export function pickJustLanded(tools: Tool[], limit = 4): Tool[] {
  return pickWeeklyDrop(tools).slice(0, limit);
}

export function JustLanded({ tools }: { tools: Tool[] }) {
  const fresh = pickJustLanded(tools);
  if (fresh.length < 3) return null;

  return (
    <section className="just-landed home-open" aria-labelledby="just-landed-heading">
      <div className="section-head">
        <div className="section-heading">
          <p className="title-count">
            {fresh.length.toLocaleString()} tools
          </p>
          <h2 id="just-landed-heading" className="section-title">
            Just landed
          </h2>
        </div>
        <Link
          href="/drop"
          className="section-link"
          {...trackAttrs("section_click", {
            section: "just_landed",
            label: "This week’s drop",
            href: "/drop",
          })}
        >
          This week’s drop
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7 4h9v9M16 4 4 16" />
          </svg>
        </Link>
      </div>

      <ol className="just-landed-grid">
        {fresh.map((tool) => {
          const media = cardMediaUrl(tool);
          const accent = tool.brandColor ?? "oklch(0.42 0.08 145)";
          return (
            <li key={tool.id}>
              <Link
                href={`/tools/${tool.slug}`}
                className="just-landed-card teaser-card"
                {...trackAttrs("tool_card_open", {
                  tool_slug: tool.slug,
                  placement: "just_landed",
                  method: "click",
                })}
              >
                <div
                  className="just-landed-media teaser-media"
                  style={{ background: accent }}
                >
                  <PreviewFrame
                    src={media}
                    fallback={
                      <div
                        className="tool-card-fallback"
                        style={{
                          background: `linear-gradient(160deg, ${accent} 0%, oklch(0.24 0.03 55) 100%)`,
                        }}
                        aria-hidden="true"
                      >
                        <span className="tool-card-fallback-name">
                          {tool.name}
                        </span>
                      </div>
                    }
                  />
                </div>
                <div className="just-landed-body">
                  <strong className="teaser-title">{tool.name}</strong>
                  <p>{tool.summary}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
