/**
 * Shared Open Graph typography — keep in lockstep with CSS tokens in globals.css:
 *   --leading-display: 1.7
 *   --leading-display-solo: 1.12
 *   --leading-body: 1.55
 *   --leading-body-snug: 1.5
 *
 * Satori needs numeric lineHeight; do not invent per-route values.
 */
export const OG_LEADING = {
  /** Wrapping Boldonse titles (tool names, drop headlines). */
  display: 1.7,
  /** Single-line Boldonse only (brand lockups that never wrap). */
  displaySolo: 1.12,
  /** Figtree body / summary on cards. */
  body: 1.5,
  /** Compact Figtree rows (numbered lists). */
  bodySnug: 1.45,
} as const;

export const OG_COLORS = {
  paper: "#f4f0e6",
  ink: "#2a2118",
  inkSoft: "#5c4f40",
  muted: "#7a6a58",
  accent: "#3d5c3d",
} as const;

export const OG_PAPER_BG =
  "radial-gradient(900px 420px at 8% -10%, rgba(74,110,74,0.18), transparent 55%), radial-gradient(700px 380px at 100% 0%, rgba(196,120,56,0.14), transparent 50%)";

/** Bottom-right share lockup — real launch domain. */
export const OG_SITE_HOST = "toolshelf.space";

export const OG_SIZE = { width: 1200, height: 630 } as const;
