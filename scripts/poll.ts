import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { pollLatest } from "../src/lib/hn/ingest";

async function main() {
  const result = await pollLatest();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
