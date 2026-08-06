import { ImageResponse } from "next/og";
import { listTools } from "@/lib/db/queries";
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

export default async function Image() {
  let line1 = "Fresh launches landing soon";
  let line2 = " ";
  let line3 = " ";
  let countLabel = "This week";

  try {
    if (process.env.DATABASE_URL) {
      const tools = await listTools({ sort: "newest", limit: 5 });
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const fresh = tools.filter(
        (t) => new Date(t.firstSeenAt).getTime() >= weekStart.getTime(),
      );
      const list = fresh.length ? fresh : tools;
      countLabel =
        list.length > 0 ? `${list.length} fresh picks` : "This week";
      if (list[0]) line1 = safeText(list[0].name, 34);
      if (list[1]) line2 = safeText(list[1].name, 34);
      if (list[2]) line3 = safeText(list[2].name, 34);
    }
  } catch (err) {
    console.error("drop og fetch failed", err);
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
          <span style={{ color: OG_COLORS.muted }}>Weekly drop</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Boldonse",
              fontSize: 68,
              lineHeight: OG_LEADING.display,
              letterSpacing: "-0.02em",
              maxWidth: 980,
              marginBottom: 28,
              fontWeight: 400,
            }}
          >
            This week on the shelf
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
          <span>This week’s drop · {countLabel}</span>
          <OgSiteLink />
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
