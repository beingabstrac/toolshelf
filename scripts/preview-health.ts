import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { tools } from "../src/lib/db/schema";
import {
  isOgPreview,
  isScreenshotPreview,
  looksLikeLogoUrl,
} from "../src/lib/enrich/media";

/** Print shelf preview quality counts for polish sessions. */
async function main() {
  const db = getDb();
  const rows = await db
    .select({
      slug: tools.slug,
      previewImageUrl: tools.previewImageUrl,
    })
    .from(tools)
    .where(eq(tools.status, "published"));

  let empty = 0;
  let logoLike = 0;
  let screenshot = 0;
  let ogOk = 0;

  for (const row of rows) {
    const url = row.previewImageUrl?.trim() ?? "";
    if (!url) {
      empty += 1;
      continue;
    }
    if (isScreenshotPreview(url)) {
      screenshot += 1;
      continue;
    }
    if (looksLikeLogoUrl(url)) {
      logoLike += 1;
      continue;
    }
    if (isOgPreview(url)) {
      ogOk += 1;
      continue;
    }
    logoLike += 1;
  }

  const total = rows.length;
  const weak = empty + logoLike + screenshot;
  console.log(
    JSON.stringify(
      {
        total,
        ogOk,
        empty,
        logoLike,
        screenshot,
        weak,
        weakPct: total ? Math.round((weak / total) * 1000) / 10 : 0,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
