import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { processPendingCandidates } from "../src/lib/ingest/process";
import { getIngestionStatus } from "../src/lib/ingest/process";

async function main() {
  const maxRounds = Number(process.argv[2] ?? "25");
  for (let i = 0; i < maxRounds; i++) {
    const result = await processPendingCandidates({ limit: 8 });
    console.log(JSON.stringify({ round: i + 1, ...result }));
    if (result.processed === 0) break;
  }
  console.log(JSON.stringify({ status: await getIngestionStatus() }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
