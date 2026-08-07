import posthog from "posthog-js";

/** Inject third-party analytics scripts from public env vars. Safe to call once. */

export function bootAnalyticsScripts() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const gtm = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  if (gtm && !document.getElementById("toolshelf-gtm")) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const s = document.createElement("script");
    s.id = "toolshelf-gtm";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtm)}`;
    document.head.appendChild(s);
  }

  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (ga && !document.getElementById("toolshelf-ga")) {
    const s = document.createElement("script");
    s.id = "toolshelf-ga";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", ga, { send_page_view: false });
  }

  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  if (plausible && !document.getElementById("toolshelf-plausible")) {
    const s = document.createElement("script");
    s.id = "toolshelf-plausible";
    s.defer = true;
    s.setAttribute("data-domain", plausible);
    s.src = "https://plausible.io/js/script.tagged-events.js";
    document.head.appendChild(s);
  }

  const posthogProjectToken =
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();

  if (!posthogProjectToken || !posthogHost) {
    if (process.env.NODE_ENV === "development") {
      const missingVariable = !posthogProjectToken
        ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
        : "NEXT_PUBLIC_POSTHOG_HOST";
      throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
      );
    }
    return;
  }

  if (!posthog.__loaded) {
    posthog.init(posthogProjectToken, {
      api_host: posthogHost,
      capture_pageview: false,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
    });
  }
}
