import { renderCompareOg } from "@/lib/og-compare";

export const runtime = "nodejs";
export const revalidate = 3600;

/** Compare share image with query params (opengraph-image cannot see them). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const a = searchParams.get("a");
  const b = searchParams.get("b");
  return renderCompareOg(a, b);
}
