import type {
  AnalyticsEvent,
  AnalyticsPayload,
  AnalyticsProps,
  AnalyticsSink,
} from "./types";

const sinks = new Set<AnalyticsSink>();
const queue: AnalyticsPayload[] = [];
let booted = false;

function nowIso() {
  return new Date().toISOString();
}

function locationMeta() {
  if (typeof window === "undefined") {
    return { path: "", url: undefined as string | undefined, referrer: undefined as string | undefined };
  }
  return {
    path: `${window.location.pathname}${window.location.search}`,
    url: window.location.href,
    referrer: document.referrer || undefined,
  };
}

function ensureWindowApi() {
  if (typeof window === "undefined") return;
  if (window.toolshelfAnalytics) return;
  window.toolshelfAnalytics = {
    track: (event, props) => track(event as AnalyticsEvent, props),
    page: (props) => page(props),
    queue,
    sinks: [],
  };
}

export function registerSink(sink: AnalyticsSink) {
  sinks.add(sink);
  ensureWindowApi();
  if (typeof window !== "undefined") {
    window.toolshelfAnalytics!.sinks = [...sinks];
  }
  if (!booted && queue.length) {
    const pending = queue.splice(0, queue.length);
    for (const payload of pending) emit(payload);
  }
  booted = true;
}

export function unregisterSink(sink: AnalyticsSink) {
  sinks.delete(sink);
}

function emit(payload: AnalyticsPayload) {
  ensureWindowApi();
  if (typeof window !== "undefined") {
    window.toolshelfAnalytics!.queue.push(payload);
    // Keep a bounded replay buffer for late-loading tools
    if (window.toolshelfAnalytics!.queue.length > 200) {
      window.toolshelfAnalytics!.queue.splice(
        0,
        window.toolshelfAnalytics!.queue.length - 200,
      );
    }
  }

  if (sinks.size === 0) {
    queue.push(payload);
    if (queue.length > 200) queue.splice(0, queue.length - 200);
    return;
  }

  for (const sink of sinks) {
    try {
      sink(payload);
    } catch {
      // Never break UX for analytics
    }
  }
}

/** Fire a product analytics event (client-only; no-ops on server). */
export function track(
  event: AnalyticsEvent | (string & {}),
  props: AnalyticsProps = {},
) {
  if (typeof window === "undefined") return;
  const loc = locationMeta();
  const clean: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    clean[key] = value;
  }
  emit({
    event,
    props: clean,
    ts: nowIso(),
    path: loc.path,
    url: loc.url,
    referrer: loc.referrer,
  });
}

/** Convenience page view helper. */
export function page(props: AnalyticsProps = {}) {
  track("page_view", props);
}
