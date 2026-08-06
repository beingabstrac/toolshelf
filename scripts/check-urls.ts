import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { checkToolUrls } = await import("../src/lib/enrich/url-health");
  const limit = Number(process.argv[2] ?? 40);
  const force = process.argv.includes("--force");
  const result = await checkToolUrls({ limit, force });
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
