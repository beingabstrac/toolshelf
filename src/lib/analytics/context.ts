import type { AnalyticsProps } from "./types";

/** Derive standard page dims from a path + search string. */
export function pageContextFromLocation(
  pathname: string,
  search = "",
): AnalyticsProps {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const props: AnalyticsProps = {
    page: pathname,
  };

  const q = params.get("q");
  const category = params.get("category");
  const source = params.get("source");
  const sort = params.get("sort");
  const hideBroken = params.get("hideBroken");
  const a = params.get("a");
  const b = params.get("b");

  if (q) props.q = q;
  if (category) props.category = category;
  if (source) props.source = source;
  if (sort) props.sort = sort;
  if (hideBroken === "1" || hideBroken === "true") props.hide_broken = true;
  if (a) props.compare_a = a;
  if (b) props.compare_b = b;

  if (pathname === "/") props.surface = "home";
  else if (pathname.startsWith("/search")) props.surface = "search";
  else if (pathname.startsWith("/tools/")) {
    props.surface = "tool";
    props.tool_slug = pathname.replace(/^\/tools\//, "").split("/")[0] || "";
  } else if (pathname.startsWith("/aisles/")) {
    props.surface = "aisle";
    const slug = pathname.replace(/^\/aisles\//, "").split("/")[0] || "";
    if (slug && slug !== "this-week") props.aisle = slug;
  } else if (pathname === "/aisles") props.surface = "aisles_index";
  else if (pathname.startsWith("/drop/")) {
    props.surface = "drop_week";
    props.week = pathname.replace(/^\/drop\//, "").split("/")[0] || "";
  } else if (pathname === "/drop") props.surface = "drop";
  else if (pathname.startsWith("/compare")) props.surface = "compare";
  else if (pathname === "/saved") props.surface = "saved";
  else if (pathname === "/about") props.surface = "about";
  else props.surface = "other";

  return props;
}

/** Map surface → dedicated view event (fired alongside page_view). */
export function surfaceViewEvent(
  surface: string | number | boolean | string[] | null | undefined,
):
  | "tool_view"
  | "search_view"
  | "aisle_view"
  | "drop_view"
  | "compare_view"
  | "saved_view"
  | "about_view"
  | null {
  switch (surface) {
    case "tool":
      return "tool_view";
    case "search":
      return "search_view";
    case "aisle":
      return "aisle_view";
    case "drop":
    case "drop_week":
      return "drop_view";
    case "compare":
      return "compare_view";
    case "saved":
      return "saved_view";
    case "about":
      return "about_view";
    default:
      return null;
  }
}
