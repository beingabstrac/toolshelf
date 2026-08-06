import type { Metadata } from "next";
import { Suspense } from "react";
import { SavedShelf } from "@/components/saved-shelf";
import { PageShelfSkeleton } from "@/components/skeletons";
import { getCachedShelf } from "@/lib/db/cached";
import { SITE_NAME } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Saved tools",
  description: `Tools you starred on this device. Private, no account. ${SITE_NAME}.`,
  alternates: { canonical: "/saved" },
  robots: { index: false, follow: true },
};

async function SavedBody() {
  const tools = process.env.DATABASE_URL ? await getCachedShelf() : [];
  return <SavedShelf tools={tools} />;
}

export default function SavedPage() {
  return (
    <main id="main" className="page-stack">
      <Suspense fallback={<PageShelfSkeleton />}>
        <SavedBody />
      </Suspense>
    </main>
  );
}
