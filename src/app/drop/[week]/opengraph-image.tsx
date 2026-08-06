import { ImageResponse } from "next/og";
import { listToolsSeenBetween } from "@/lib/db/queries";
import {
  parseWeekId,
  weekRange,
  weekRangeLabel,
} from "@/lib/drop";
import { loadOgFonts } from "@/lib/og-fonts";
import { OgSiteLink } from "@/lib/og-site-link";
import { OG_COLORS, OG_LEADING, OG_PAPER_BG } from "@/lib/og-style";
import { SITE_NAME } from "@/lib/seo";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

function safeText(input: string, max = 40): string {
  return input
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export default async function Image({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  const range = weekRange(week);
  let line1 = "No tools archived yet";
  let line2 = " ";
  let line3 = " ";
  let countLabel = week;

  if (range && process.env.DATABASE_URL && parseWeekId(week)) {
    try {
      const tools = await listToolsSeenBetween(range.start, range.end, 5);
      countLabel =
        tools.length > 0
          ? `${tools.length} tools · ${weekRangeLabel(week)}`
          : weekRangeLabel(week);
      if (tools[0]) line1 = safeText(tools[0].name, 34);
      if (tools[1]) line2 = safeText(tools[1].name, 34);
      if (tools[2]) line3 = safeText(tools[2].name, 34);
    } catch (err) {
      console.error("drop week og failed", err);
    }
  }

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
          <span style={{ color: OG_COLORS.muted }}>{week}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Boldonse",
              fontSize: 64,
              lineHeight: OG_LEADING.display,
              letterSpacing: "-0.02em",
              maxWidth: 980,
              marginBottom: 28,
              fontWeight: 400,
            }}
          >
            Shelf drop archive
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: OG_LEADING.bodySnug,
              color: OG_COLORS.inkSoft,
              marginBottom: 10,
            }}
          >
            <span style={{ color: OG_COLORS.accent, fontWeight: 700, width: 64 }}>
              01
            </span>
            <span>{line1}</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: OG_LEADING.bodySnug,
              color: OG_COLORS.inkSoft,
              marginBottom: 10,
            }}
          >
            <span style={{ color: OG_COLORS.accent, fontWeight: 700, width: 64 }}>
              02
            </span>
            <span>{line2}</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: OG_LEADING.bodySnug,
              color: OG_COLORS.inkSoft,
            }}
          >
            <span style={{ color: OG_COLORS.accent, fontWeight: 700, width: 64 }}>
              03
            </span>
            <span>{line3}</span>
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
          <span>{countLabel}</span>
          <OgSiteLink />
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
