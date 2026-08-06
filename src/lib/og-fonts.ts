import type { ImageResponseOptions } from "next/server";

type OgFonts = NonNullable<ImageResponseOptions["fonts"]>;

let cached: Promise<OgFonts> | null = null;

/** Brand fonts for Open Graph cards — same faces as the site. */
export function loadOgFonts(): Promise<OgFonts> {
  if (!cached) {
    cached = Promise.all([
      fetch("https://fonts.gstatic.com/s/boldonse/v1/ZgNQjPxGPbbJUZemjC38.ttf").then(
        (r) => r.arrayBuffer(),
      ),
      fetch(
        "https://fonts.gstatic.com/s/figtree/v9/_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_d_QF5e.ttf",
      ).then((r) => r.arrayBuffer()),
      fetch(
        "https://fonts.gstatic.com/s/figtree/v9/_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_eYR15e.ttf",
      ).then((r) => r.arrayBuffer()),
    ]).then(([boldonse, figtree, figtreeBold]) => [
      { name: "Boldonse", data: boldonse, weight: 400 as const, style: "normal" as const },
      { name: "Figtree", data: figtree, weight: 400 as const, style: "normal" as const },
      { name: "Figtree", data: figtreeBold, weight: 700 as const, style: "normal" as const },
    ]);
  }
  return cached;
}
