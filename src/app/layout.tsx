import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { CommandShelfHost } from "@/components/command-shelf-host";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { defaultMetadata } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = defaultMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#f4f0e6" },
  ],
};

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Boldonse&family=Figtree:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        ) : null}
        {posthogKey ? (
          <Script id="posthog-init" strategy="afterInteractive">
            {`
              !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture identify".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
              posthog.init('${posthogKey}',{api_host:'${posthogHost}',person_profiles:'identified_only',capture_pageview:true,capture_pageleave:true});
            `}
          </Script>
        ) : null}
      </head>
      <body>
        <Suspense fallback={null}>
          <AnalyticsProvider>
            <a className="skip-link" href="#main">
              Skip to content
            </a>
            <SiteChrome
              search={
                <Suspense fallback={null}>
                  <CommandShelfHost />
                </Suspense>
              }
            />
            <div className="shell">{children}</div>
            <SiteFooter />
          </AnalyticsProvider>
        </Suspense>
      </body>
    </html>
  );
}
