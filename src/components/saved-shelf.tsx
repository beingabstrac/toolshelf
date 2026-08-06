"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { trackAttrs } from "@/lib/analytics";
import type { Tool } from "@/lib/db/schema";
import { readSaved, savedSlugsNewestFirst } from "@/lib/saved";
import { ToolCard } from "./tool-card";

export function SavedShelf({ tools }: { tools: Tool[] }) {
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

  return (
    <>
      <header className="page-header">
        <p className="title-count">
          {savedTools.length.toLocaleString()} tools
        </p>
        <h1 className="page-title">Saved</h1>
        <p className="page-lede">
          Starred on this device. Private, no account.
        </p>
      </header>

      {savedTools.length === 0 ? (
        <div className="empty-state">
          <h2>No stars yet</h2>
          <p>Tap the star on any tool card to keep it here for later.</p>
          <div className="empty-actions">
            <Link
              className="btn"
              href="/"
              {...trackAttrs("empty_cta_click", {
                cta: "browse_shelf",
                placement: "saved",
              })}
            >
              Browse the shelf
            </Link>
          </div>
        </div>
      ) : (
        <div className="tool-shelf home-open">
          <div className="tool-grid">
            {savedTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} placement="saved" />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
