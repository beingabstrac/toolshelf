import type { AnalyticsPayload, AnalyticsSink } from "./types";

function flattenProps(payload: AnalyticsPayload): Record<string, unknown> {
  return {
    ...payload.props,
    path: payload.path,
    url: payload.url,
    referrer: payload.referrer,
    ts: payload.ts,
  };
}

/** Always on: GTM / generic dataLayer. */
export const dataLayerSink: AnalyticsSink = (payload) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: payload.event,
    ...flattenProps(payload),
  });
};

/** Always on: DOM CustomEvent for any listener / browser extension. */
export const domEventSink: AnalyticsSink = (payload) => {
  window.dispatchEvent(
    new CustomEvent("toolshelf:analytics", { detail: payload }),
  );
};

/** Debug: console when NEXT_PUBLIC_ANALYTICS_DEBUG=1 or localStorage toolshelf:analytics-debug=1 */
export const debugSink: AnalyticsSink = (payload) => {
  const envOn = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1";
  const localOn =
    typeof localStorage !== "undefined" &&
    localStorage.getItem("toolshelf:analytics-debug") === "1";
  if (!envOn && !localOn) return;
  console.info("[toolshelf:analytics]", payload.event, payload.props);
};

/** GA4 via gtag when script loaded. */
export const gtagSink: AnalyticsSink = (payload) => {
  if (typeof window.gtag !== "function") return;
  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (payload.event === "page_view" && ga) {
    window.gtag("config", ga, {
      page_path: payload.path,
      page_location: payload.url,
      ...payload.props,
    });
    return;
  }
  window.gtag("event", payload.event, flattenProps(payload));
};

/** Plausible custom events when script loaded. */
export const plausibleSink: AnalyticsSink = (payload) => {
  if (typeof window.plausible !== "function") return;
  const props: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(flattenProps(payload))) {
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      props[k] = v;
    } else if (Array.isArray(v)) {
      props[k] = v.join(",");
    }
  }
  window.plausible(payload.event, { props });
};

/** PostHog when snippet loaded. */
export const posthogSink: AnalyticsSink = (payload) => {
  if (!window.posthog?.capture) return;
  if (payload.event === "page_view") {
    window.posthog.capture("$pageview", {
      $current_url: payload.url,
      $pathname: payload.path,
      $host: typeof window !== "undefined" ? window.location.host : "",
      $title: typeof document !== "undefined" ? document.title : "",
      ...flattenProps(payload),
    });
    return;
  }
  window.posthog.capture(payload.event, flattenProps(payload));
};

export const DEFAULT_SINKS: AnalyticsSink[] = [
  dataLayerSink,
  domEventSink,
  debugSink,
  gtagSink,
  plausibleSink,
  posthogSink,
];
