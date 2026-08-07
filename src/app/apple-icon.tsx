import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { OG_COLORS } from "@/lib/og-style";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const fonts = await loadOgFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: OG_COLORS.paper,
          color: OG_COLORS.ink,
          fontFamily: "Boldonse",
          fontSize: 84,
          fontWeight: 400,
          paddingTop: "6px",
        }}
      >
        T
      </div>
    ),
    { ...size, fonts },
  );
}
