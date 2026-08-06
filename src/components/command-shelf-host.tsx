import { getCachedWideShelf } from "@/lib/db/cached";
import { CommandPalette } from "./command-palette";

/** Server host: loads shelf once for the global command palette. */
export async function CommandShelfHost() {
  const tools = process.env.DATABASE_URL
    ? await getCachedWideShelf().catch(() => [])
    : [];
  return <CommandPalette tools={tools} />;
}
