import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const cols = await sql`
  select column_name
  from information_schema.columns
  where table_name = 'tools'
  order by ordinal_position
`;
console.log(
  "COLS",
  cols.map((c) => c.column_name).join(","),
);
const rows = await sql`
  select slug, preview_image_url, brand_color, hn_first_seen_at
  from tools
  where status = 'published'
  order by hn_first_seen_at desc
  limit 10
`;
for (const r of rows) {
  console.log(
    [
      r.slug,
      r.preview_image_url ? "YES" : "NO",
      (r.preview_image_url || "").slice(0, 90),
      r.hn_first_seen_at,
    ].join(" | "),
  );
}
