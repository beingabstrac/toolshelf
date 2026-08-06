import { NextResponse } from "next/server";
import {
  backfillShowHn,
  backfillToolLikeStories,
  getIngestionStatus,
} from "@/lib/hn/ingest";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const stream = url.searchParams.get("stream") ?? "show_hn";
  const maxHits = Number(url.searchParams.get("max") ?? "100");

  try {
    if (stream === "status") {
      return NextResponse.json(await getIngestionStatus());
    }

    const result =
      stream === "stories"
        ? await backfillToolLikeStories({ maxHits })
        : await backfillShowHn({ maxHits });

    return NextResponse.json({ ok: true, stream, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backfill failed" },
      { status: 500 },
    );
  }
}
