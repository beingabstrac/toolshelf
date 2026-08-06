"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { propsFromTrackElement } from "@/lib/analytics/attrs";
import { bootAnalyticsScripts } from "@/lib/analytics/boot-scripts";
import {
  pageContextFromLocation,
  surfaceViewEvent,
} from "@/lib/analytics/context";
import { DEFAULT_SINKS } from "@/lib/analytics/sinks";
import { page, registerSink, track } from "@/lib/analytics/track";

/**
 * Mount once in root layout.
 * - Registers universal sinks (dataLayer, CustomEvent, optional GA/Plausible/PostHog)
 * - Auto page_view + surface views on client navigations
 * - Delegates clicks on [data-track] (works for Server Component links)
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const lastPathRef = useRef<string>("");

  useEffect(() => {
    for (const sink of DEFAULT_SINKS) registerSink(sink);
    bootAnalyticsScripts();
  }, []);

  useEffect(() => {
    const key = `${pathname}?${search}`;
    if (lastPathRef.current === key) return;
    lastPathRef.current = key;

    const ctx = pageContextFromLocation(pathname, search ? `?${search}` : "");
    page(ctx);
    const surfaceEvent = surfaceViewEvent(ctx.surface);
    if (surfaceEvent) track(surfaceEvent, ctx);
  }, [pathname, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target) return;
      const el = target.closest("[data-track]");
      if (!el) return;
      const parsed = propsFromTrackElement(el);
      if (!parsed) return;
      track(parsed.event, parsed.props);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return <>{children}</>;
}
