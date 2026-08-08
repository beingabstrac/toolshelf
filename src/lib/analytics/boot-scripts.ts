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
    window.gtag("config", ga);
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

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (
    posthogKey &&
    !window.posthog?.__SV &&
    !document.getElementById("toolshelf-posthog-init") &&
    !document.getElementById("posthog-init")
  ) {
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
    const init = document.createElement("script");
    init.id = "toolshelf-posthog-init";
    init.text = `
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture identify".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init(${JSON.stringify(posthogKey)},{api_host:${JSON.stringify(host)},capture_pageview:true,capture_pageleave:true,persistence:"localStorage+cookie"});
`;
    document.head.appendChild(init);
  }
}
