import { redirect } from "next/navigation";
import { aisleOfTheWeek } from "@/lib/collections";

export const revalidate = 3600;

export default function AisleThisWeekPage() {
  const def = aisleOfTheWeek();
  redirect(`/aisles/${def.slug}`);
}
