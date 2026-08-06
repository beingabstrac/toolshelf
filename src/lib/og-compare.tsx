import { ImageResponse } from "next/og";
import { getToolBySlug } from "@/lib/db/queries";
import { loadOgFonts } from "@/lib/og-fonts";
import { OgSiteLink } from "@/lib/og-site-link";
import { OG_COLORS, OG_LEADING, OG_PAPER_BG, OG_SIZE } from "@/lib/og-style";
import { SITE_NAME } from "@/lib/seo";

export async function renderCompareOg(a?: string | null, b?: string | null) {
  const [left, right] = await Promise.all([
    a && process.env.DATABASE_URL ? getToolBySlug(a) : null,
    b && process.env.DATABASE_URL ? getToolBySlug(b) : null,
  ]);

  const leftName = left?.name ?? "Pick a tool";
  const rightName = right?.name ?? "Pick another";
  const leftSummary =
    left?.summary?.slice(0, 90) ?? "Choose something from the shelf.";
  const rightSummary =
    right?.summary?.slice(0, 90) ?? "Then see both side by side.";

  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: OG_COLORS.paper,
          backgroundImage: OG_PAPER_BG,
          color: OG_COLORS.ink,
          fontFamily: "Figtree",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 28,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: OG_COLORS.accent,
            fontWeight: 700,
          }}
        >
          <span>{SITE_NAME}</span>
          <span style={{ color: OG_COLORS.muted }}>Compare</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 28,
            alignItems: "stretch",
            flex: 1,
            marginTop: 36,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "28px 32px",
              borderRadius: 28,
              background: "rgba(255,255,255,0.55)",
            }}
          >
            <div
              style={{
                fontFamily: "Boldonse",
                fontSize: leftName.length > 18 ? 42 : 52,
                lineHeight: OG_LEADING.display,
                letterSpacing: "-0.02em",
                marginBottom: 16,
                fontWeight: 400,
              }}
            >
              {leftName}
            </div>
            <div
              style={{
                fontSize: 26,
                lineHeight: OG_LEADING.body,
                color: OG_COLORS.inkSoft,
              }}
            >
              {leftSummary}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: "Boldonse",
              fontSize: 36,
              lineHeight: OG_LEADING.displaySolo,
              color: OG_COLORS.accent,
              fontWeight: 400,
            }}
          >
            vs
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "28px 32px",
              borderRadius: 28,
              background: "rgba(255,255,255,0.55)",
            }}
          >
            <div
              style={{
                fontFamily: "Boldonse",
                fontSize: rightName.length > 18 ? 42 : 52,
                lineHeight: OG_LEADING.display,
                letterSpacing: "-0.02em",
                marginBottom: 16,
                fontWeight: 400,
              }}
            >
              {rightName}
            </div>
            <div
              style={{
                fontSize: 26,
                lineHeight: OG_LEADING.body,
                color: OG_COLORS.inkSoft,
              }}
            >
              {rightSummary}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 26,
            color: OG_COLORS.muted,
          }}
        >
          <span>Side by side on the shelf</span>
          <OgSiteLink />
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
