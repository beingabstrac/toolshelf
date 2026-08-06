import { config } from "dotenv";
config({ path: ".env.local" });
config();
import {
  backfillShowHn,
  backfillToolLikeStories,
  getIngestionStatus,
} from "../src/lib/hn/ingest";
import { pollDevHunt } from "../src/lib/devhunt/ingest";
import { pollLobsters } from "../src/lib/lobsters/ingest";
import { processPendingCandidates } from "../src/lib/ingest/process";
import { pollProductHunt } from "../src/lib/producthunt/ingest";
import { pollUneed } from "../src/lib/uneed/ingest";

async function main() {
  const stream = process.argv[2] ?? "show_hn";
  const maxHits = Number(process.argv[3] ?? "150");

  if (stream === "status") {
    console.log(JSON.stringify(await getIngestionStatus(), null, 2));
    return;
  }

  if (stream === "producthunt" || stream === "ph") {
    const result = await pollProductHunt({ first: maxHits, classify: true });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (stream === "lobsters") {
    const fetched = await pollLobsters();
    const classified = await processPendingCandidates({ limit: 10 });
    console.log(JSON.stringify({ ...fetched, classified }, null, 2));
    return;
  }

  if (stream === "uneed") {
    const fetched = await pollUneed({
      perCategory: Math.min(maxHits, 40),
      trendingLimit: Math.min(maxHits, 40),
    });
    const classified = await processPendingCandidates({ limit: 8 });
    console.log(JSON.stringify({ ...fetched, classified }, null, 2));
    return;
  }

  if (stream === "devhunt") {
    const fetched = await pollDevHunt({
      limit: Math.min(maxHits, 40),
    });
    const classified = await processPendingCandidates({ limit: 8 });
    console.log(JSON.stringify({ ...fetched, classified }, null, 2));
    return;
  }

  const result =
    stream === "stories"
      ? await backfillToolLikeStories({ maxHits })
      : await backfillShowHn({ maxHits });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
