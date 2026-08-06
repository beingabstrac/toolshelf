import type { AnalyticsEvent, AnalyticsProps } from "./types";

/**
 * Build `data-track` + `data-track-*` props for any clickable element.
 * AnalyticsProvider delegates clicks on these — works from Server Components.
 *
 * @example
 * <Link href="/drop" {...trackAttrs("nav_click", { label: "Drop" })}>
 */
export function trackAttrs(
  event: AnalyticsEvent | (string & {}),
  props: AnalyticsProps = {},
): Record<string, string> {
  const attrs: Record<string, string> = {
    "data-track": String(event),
  };
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    const attrKey = `data-track-${key.replace(/_/g, "-")}`;
    attrs[attrKey] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return attrs;
}

/** Parse data-track-* from an element into props. */
export function propsFromTrackElement(el: Element): {
  event: string;
  props: AnalyticsProps;
} | null {
  const event = el.getAttribute("data-track");
  if (!event) return null;
  const props: AnalyticsProps = {};
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith("data-track-")) continue;
    const key = attr.name.slice("data-track-".length).replace(/-/g, "_");
    if (!key) continue;
    const raw = attr.value;
    if (raw === "true") props[key] = true;
    else if (raw === "false") props[key] = false;
    else if (/^-?\d+(\.\d+)?$/.test(raw)) props[key] = Number(raw);
    else props[key] = raw;
  }
  return { event, props };
}
