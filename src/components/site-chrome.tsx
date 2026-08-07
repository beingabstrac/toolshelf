"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackAttrs } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/drop", label: "Drop", match: "/drop" },
  { href: "/aisles", label: "Aisles", match: "/aisles" },
  { href: "/saved", label: "Saved", match: "/saved" },
] as const;

export function SiteChrome({ search }: { search?: ReactNode }) {
  const pathname = usePathname() || "/";
  const onHome = pathname === "/";
  const [stuck, setStuck] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onScroll() {
      setStuck(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    function publishHeight() {
      const node = headerRef.current;
      if (!node) return;
      const height = node.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        "--header-height",
        `${Math.ceil(height)}px`,
      );
    }

    publishHeight();
    const ro = new ResizeObserver(publishHeight);
    ro.observe(el);
    window.addEventListener("resize", publishHeight, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", publishHeight);
    };
  }, [pathname]);

  return (
    <header
      ref={headerRef}
      className={cn(
        "site-chrome",
        onHome && "site-chrome-home",
        stuck && "site-chrome-stuck",
      )}
    >
      <div className="site-chrome-inner">
        <Link
          href="/"
          className={cn(
            "site-brand",
            onHome && !stuck && "site-brand-home",
          )}
          aria-label="Toolshelf home"
          tabIndex={onHome && !stuck ? -1 : undefined}
          aria-hidden={onHome && !stuck ? true : undefined}
          {...trackAttrs("brand_click", { href: "/" })}
        >
          <span className="site-brand-name">Toolshelf</span>
        </Link>
        <nav className="site-nav" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              pathname === item.match ||
              pathname.startsWith(`${item.match}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("site-nav-link", active && "site-nav-active")}
                aria-current={active ? "page" : undefined}
                {...trackAttrs("nav_click", {
                  label: item.label,
                  href: item.href,
                })}
              >
                {item.label}
              </Link>
            );
          })}
          {search}
        </nav>
      </div>
    </header>
  );
}
