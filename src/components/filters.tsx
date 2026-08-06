/** Legacy server filters — home uses client Directory. Kept for typed URL helpers. */
import type { ToolSort } from "@/lib/db/queries";

export const SORTS: { id: ToolSort; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "discussed", label: "Discussed" },
  { id: "newest", label: "Newest" },
];
