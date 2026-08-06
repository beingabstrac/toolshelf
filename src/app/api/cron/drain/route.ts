import { NextResponse } from "next/server";
import { processPendingCandidates } from "@/lib/ingest/process";

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

  try {
    let accepted = 0;
    let rejected = 0;
    let rounds = 0;
    for (let i = 0; i < 8; i++) {
      const result = await processPendingCandidates({ limit: 6 });
      rounds += 1;
      accepted += result.accepted;
      rejected += result.rejected;
      if (result.quotaHit || result.processed === 0) break;
    }
    return NextResponse.json({ ok: true, rounds, accepted, rejected });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Drain failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
