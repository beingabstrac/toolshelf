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
