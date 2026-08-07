import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { OG_COLORS } from "@/lib/og-style";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
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
          fontSize: 24,
          fontWeight: 400,
          lineHeight: 1,
        }}
      >
        T
      </div>
    ),
    { ...size, fonts },
  );
}
