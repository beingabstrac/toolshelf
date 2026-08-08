"use client";

import { useState } from "react";
import { productLogoUrl } from "@/lib/enrich/logo";

type ToolLogoProps = {
  tool: {
    name: string;
    url: string;
    logoUrl?: string | null;
    brandColor?: string | null;
  };
  size?: number;
  className?: string;
};

export function ToolLogo({ tool, size = 28, className }: ToolLogoProps) {
  const [failed, setFailed] = useState(false);
  const rawLogo = productLogoUrl(tool.logoUrl);
  const src = rawLogo;
  const accent = tool.brandColor ?? "oklch(0.42 0.08 145)";
  const initial = tool.name ? tool.name.trim().charAt(0).toUpperCase() : "?";

  if (failed || !src) {
    return (
      <span
        className={`tool-logo-fallback ${className ?? ""}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: Math.max(4, Math.floor(size * 0.25)),
          background: accent,
          color: "white",
          display: "inline-grid",
          placeItems: "center",
          fontFamily: "var(--font-display)",
          fontSize: `${Math.max(10, Math.floor(size * 0.5))}px`,
          fontWeight: 700,
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${tool.name} logo`}
      width={size}
      height={size}
      className={`tool-logo-img ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: Math.max(4, Math.floor(size * 0.25)),
        objectFit: "cover",
        flexShrink: 0,
        outline: "1px solid oklch(0 0 0 / 0.08)",
      }}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
