import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { neon } from "@neondatabase/serverless";

/**
 * One-shot SQL for existing Neon DBs before/alongside drizzle push.
 * Adds source columns + composite uniques; safe to re-run.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const sql = neon(url);

  await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'hackernews'`;
  await sql`ALTER TABLE hn_mentions ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'hackernews'`;
  await sql`ALTER TABLE hn_mentions ADD COLUMN IF NOT EXISTS permalink text`;

  await sql`UPDATE candidates SET source = 'hackernews' WHERE source IS NULL OR source = ''`;
  await sql`UPDATE hn_mentions SET source = 'hackernews' WHERE source IS NULL OR source = ''`;

  await sql`UPDATE hn_mentions SET permalink = 'https://news.ycombinator.com/item?id=' || hn_object_id WHERE permalink IS NULL AND (source = 'hackernews' OR source IS NULL)`;

  // Drop legacy single-column uniques if present
  await sql`DROP INDEX IF EXISTS candidates_object_idx`;
  await sql`DROP INDEX IF EXISTS hn_mentions_object_idx`;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS candidates_source_external_idx ON candidates (source, hn_object_id)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS source_mentions_source_external_idx ON hn_mentions (source, hn_object_id)`;

  await sql`ALTER TABLE tools ADD COLUMN IF NOT EXISTS sources text[] NOT NULL DEFAULT '{}'`;
  await sql`ALTER TABLE tools ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}'`;
  await sql`
    UPDATE tools t
    SET sources = sub.sources
    FROM (
      SELECT tool_id, array_agg(DISTINCT source ORDER BY source) AS sources
      FROM hn_mentions
      GROUP BY tool_id
    ) sub
    WHERE t.id = sub.tool_id
      AND (t.sources IS NULL OR cardinality(t.sources) = 0)
  `;
  await sql`
    UPDATE tools
    SET sources = ARRAY['hackernews']::text[]
    WHERE cardinality(sources) = 0
  `;

  console.log("Multisource migration complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
