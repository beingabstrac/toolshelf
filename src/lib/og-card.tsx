import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { OgSiteLink } from "@/lib/og-site-link";
import { OG_COLORS, OG_LEADING, OG_PAPER_BG, OG_SIZE } from "@/lib/og-style";
import { SITE_NAME } from "@/lib/seo";

export { OG_SIZE };

type OgCardProps = {
  eyebrowRight: string;
  title: string;
  body: string;
  footerLeft: string;
  /** Shrink title when long so Boldonse still fits. */
  titleSize?: number;
};

/** Shared paper share card — use from every opengraph-image route. */
export async function renderOgCard({
  eyebrowRight,
  title,
  body,
  footerLeft,
  titleSize,
}: OgCardProps) {
  const fonts = await loadOgFonts();
  const size =
    titleSize ??
    (title.length > 28 ? 62 : title.length > 18 ? 72 : 84);

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
          <span style={{ color: OG_COLORS.muted }}>{eyebrowRight}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Boldonse",
              fontSize: size,
              lineHeight: OG_LEADING.display,
              letterSpacing: "-0.02em",
              maxWidth: 980,
              marginBottom: 22,
              fontWeight: 400,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 34,
              lineHeight: OG_LEADING.body,
              color: OG_COLORS.inkSoft,
              maxWidth: 920,
            }}
          >
            {body}
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
          <span>{footerLeft}</span>
          <OgSiteLink />
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
