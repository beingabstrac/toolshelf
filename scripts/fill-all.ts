import { config } from "dotenv";
config({ path: ".env.local" });
config();
import {
  backfillShowHn,
  backfillToolLikeStories,
} from "../src/lib/hn/ingest";
import { pollDevHunt } from "../src/lib/devhunt/ingest";
import { pollLobsters } from "../src/lib/lobsters/ingest";
import {
  getIngestionStatus,
  processPendingCandidates,
} from "../src/lib/ingest/process";
import { pollProductHunt } from "../src/lib/producthunt/ingest";
import { pollUneed } from "../src/lib/uneed/ingest";

/**
 * Aggressive fill: pull from every launch source, then classify until empty.
 * Reddit is detail-page lookup (not a directory poll), so skipped here.
 */
async function drain(maxRounds = 80) {
  let totalAccepted = 0;
  let totalRejected = 0;
  for (let i = 0; i < maxRounds; i++) {
    const result = await processPendingCandidates({ limit: 8 });
    totalAccepted += result.accepted;
    totalRejected += result.rejected;
    console.log(JSON.stringify({ round: i + 1, ...result }));
    if (result.quotaHit) {
      console.log("Gemini quota hit — pause drain until limit resets");
      break;
    }
    if (result.processed === 0) break;
  }
  return { totalAccepted, totalRejected };
}

async function main() {
  console.log("=== show_hn ===");
  console.log(
    JSON.stringify(
      await backfillShowHn({ maxHits: 300, classifyBatch: 10 }),
      null,
      2,
    ),
  );

  console.log("=== hn tool-like stories ===");
  console.log(
    JSON.stringify(
      await backfillToolLikeStories({ maxHits: 250, classifyBatch: 10 }),
      null,
      2,
    ),
  );

  console.log("=== producthunt ===");
  console.log(
    JSON.stringify(
      await pollProductHunt({ first: 80, classify: false }),
      null,
      2,
    ),
  );

  console.log("=== lobsters ===");
  console.log(JSON.stringify(await pollLobsters(), null, 2));

  console.log("=== uneed ===");
  console.log(
    JSON.stringify(
      await pollUneed({ perCategory: 40, trendingLimit: 40 }),
      null,
      2,
    ),
  );

  console.log("=== devhunt ===");
  console.log(
    JSON.stringify(await pollDevHunt({ limit: 40 }), null, 2),
  );

  console.log("=== drain queue ===");
  const drained = await drain(100);
  console.log(JSON.stringify(drained, null, 2));

  console.log("=== status ===");
  console.log(JSON.stringify(await getIngestionStatus(), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
