"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { trackAttrs } from "@/lib/analytics";
import type { Tool } from "@/lib/db/schema";
import { readSaved, savedSlugsNewestFirst } from "@/lib/saved";
import { ToolCard } from "./tool-card";

export function SavedAisle({ tools }: { tools: Tool[] }) {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    function sync() {
      setSlugs(savedSlugsNewestFirst(readSaved()));
    }
    sync();
    window.addEventListener("toolshelf:saved", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("toolshelf:saved", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const savedTools = useMemo(() => {
    const bySlug = new Map(tools.map((t) => [t.slug, t]));
    return slugs.map((s) => bySlug.get(s)).filter(Boolean) as Tool[];
  }, [tools, slugs]);

  if (savedTools.length === 0) return null;

  return (
    <section className="saved-aisle home-open" aria-labelledby="saved-heading">
      <div className="section-head">
        <div className="section-heading">
          <p className="title-count">
            {savedTools.length.toLocaleString()} tools
          </p>
          <h2 id="saved-heading" className="section-title">
            Saved
          </h2>
        </div>
        <Link
          href="/saved"
          className="section-link"
          {...trackAttrs("saved_view_all", {
            saved_count: savedTools.length,
          })}
        >
          View all
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7 4h9v9M16 4 4 16" />
          </svg>
        </Link>
      </div>
      <div className="tool-shelf">
        <div className="tool-grid">
          {savedTools.slice(0, 4).map((tool) => (
            <ToolCard key={tool.id} tool={tool} placement="saved_home" />
          ))}
        </div>
      </div>
    </section>
  );
}
