import Link from "next/link";
import type { Tool } from "@/lib/db/schema";
import { trackAttrs } from "@/lib/analytics";
import { aisleOfTheWeek, pickCollectionTools } from "@/lib/collections";
import { cardMediaUrl } from "@/lib/enrich/media";
import { PreviewFrame } from "./preview-frame";

export function AisleOfTheWeek({ tools }: { tools: Tool[] }) {
  const def = aisleOfTheWeek();
  const matched = pickCollectionTools(tools, def, 48);
  const picks = matched.slice(0, 3);
  if (picks.length < 2) return null;

  return (
    <section
      className="aisle-of-week home-band home-band-accent"
      aria-labelledby="aisle-week-heading"
    >
      <div className="section-head">
        <div className="section-heading">
          <p className="title-count">
            {matched.length.toLocaleString()} tools
          </p>
          <h2 id="aisle-week-heading" className="section-title">
            Aisle of the week
          </h2>
        </div>
        <Link
          href="/aisles/this-week"
          className="section-link"
          {...trackAttrs("aisle_click", {
            aisle: def.slug,
            placement: "aisle_of_week_link",
          })}
        >
          Open {def.title}
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7 4h9v9M16 4 4 16" />
          </svg>
        </Link>
      </div>

      <Link
        href={`/aisles/${def.slug}`}
        className="aisle-of-week-card teaser-card"
        {...trackAttrs("aisle_click", {
          aisle: def.slug,
          placement: "aisle_of_week_card",
        })}
      >
        <div className="editorial-aisle-thumbs" aria-hidden="true">
          {picks.map((tool) => {
            const media = cardMediaUrl(tool);
            const accent = tool.brandColor ?? "oklch(0.42 0.08 145)";
            return (
              <div
                key={tool.id}
                className="editorial-aisle-thumb teaser-media"
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
                    >
                      <span className="tool-card-fallback-name">
                        {tool.name}
                      </span>
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
        <div className="editorial-aisle-body">
          <p className="title-count">This week</p>
          <strong className="teaser-title">{def.title}</strong>
          <p>{def.blurb}</p>
        </div>
      </Link>
    </section>
  );
}
