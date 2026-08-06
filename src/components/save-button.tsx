"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { isSaved, toggleSaved } from "@/lib/saved";
import { cn } from "@/lib/utils";

export function SaveButton({
  slug,
  name,
  className,
  compact = false,
  placement = "unknown",
}: {
  slug: string;
  name: string;
  className?: string;
  compact?: boolean;
  placement?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function sync() {
      setSaved(isSaved(slug));
    }
    sync();
    window.addEventListener("toolshelf:saved", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("toolshelf:saved", sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);

  return (
    <button
      type="button"
      className={cn(
        "save-btn",
        compact && "save-btn-compact",
        saved && "save-btn-on",
        className,
      )}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      title={saved ? "Saved on this device" : "Save on this device"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = toggleSaved(slug);
        setSaved(next);
        track("tool_save", {
          tool_slug: slug,
          action: next ? "save" : "unsave",
          placement,
        });
      }}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M10 3.2 12.1 7l4.3.6-3.1 3 .7 4.3L10 12.9 6 14.9l.7-4.3-3.1-3L8 7l2-3.8Z"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {compact ? null : <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
