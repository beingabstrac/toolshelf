"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local")
  );
}

/** Native share sheets on desktop often show only the host (e.g. “localhost”). */
function preferNativeShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (typeof window === "undefined") return false;
  if (isLocalHost(window.location.hostname)) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function ShareButton({
  title,
  text,
  url,
  className,
  surface = "unknown",
  toolSlug,
}: {
  title: string;
  text: string;
  /** Path (`/tools/foo`) or absolute URL */
  url: string;
  className?: string;
  surface?: string;
  toolSlug?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "shared">("idle");

  function resolveUrl(): string {
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window !== "undefined") {
      return `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;
    }
    return url;
  }

  async function copyLink(absolute: string) {
    await navigator.clipboard.writeText(`${title}\n${absolute}`);
    setState("copied");
    track("tool_share", {
      surface,
      method: "clipboard",
      url: absolute,
      tool_slug: toolSlug,
    });
    window.setTimeout(() => setState("idle"), 2200);
  }

  async function onShare() {
    const absolute = resolveUrl();

    if (preferNativeShare()) {
      try {
        await navigator.share({ title, text, url: absolute });
        setState("shared");
        track("tool_share", {
          surface,
          method: "native",
          url: absolute,
          tool_slug: toolSlug,
        });
        window.setTimeout(() => setState("idle"), 2200);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          track("tool_share_abort", { surface, tool_slug: toolSlug });
          return;
        }
        // Fall through to clipboard
      }
    }

    try {
      await copyLink(absolute);
    } catch {
      setState("idle");
    }
  }

  const label =
    state === "copied"
      ? "Link copied"
      : state === "shared"
        ? "Shared"
        : "Share";

  return (
    <button
      type="button"
      className={className ?? "btn btn-ghost"}
      onClick={onShare}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
      </svg>
      {label}
    </button>
  );
}
