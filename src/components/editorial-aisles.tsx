import Link from "next/link";
import type { Tool } from "@/lib/db/schema";
import { trackAttrs } from "@/lib/analytics";
import { collectionTeasers } from "@/lib/collections";
import { cardMediaUrl } from "@/lib/enrich/media";
import { PreviewFrame } from "./preview-frame";

export function EditorialAisles({ tools }: { tools: Tool[] }) {
  const aisles = collectionTeasers(tools, 3);
  if (aisles.length < 2) return null;

  return (
    <section className="editorial-aisles home-open" aria-labelledby="aisles-heading">
      <div className="section-head">
        <div className="section-heading">
          <p className="title-count">
            {aisles.length.toLocaleString()} aisles
          </p>
          <h2 id="aisles-heading" className="section-title">
            Aisles
          </h2>
        </div>
        <Link
          href="/aisles"
          className="section-link"
          {...trackAttrs("section_click", {
            section: "aisles",
            label: "Browse all",
            href: "/aisles",
          })}
        >
          Browse all
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7 4h9v9M16 4 4 16" />
          </svg>
        </Link>
      </div>

      <ul className="editorial-aisles-grid">
        {aisles.slice(0, 3).map(({ def, tools: picks, count }) => (
          <li key={def.slug}>
            <Link
              href={`/aisles/${def.slug}`}
              className="editorial-aisle-card teaser-card"
              {...trackAttrs("aisle_click", {
                aisle: def.slug,
                placement: "home_aisles",
                tool_count: count,
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
                <p className="title-count">
                  {count.toLocaleString()} tools
                </p>
                <strong className="teaser-title">{def.title}</strong>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
