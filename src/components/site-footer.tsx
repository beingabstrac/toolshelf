import Link from "next/link";
import { trackAttrs } from "@/lib/analytics";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

const NAV = [
  { href: "/#shelf", label: "Shelf" },
  { href: "/drop", label: "Drop" },
  { href: "/aisles", label: "Aisles" },
  { href: "/saved", label: "Saved" },
  { href: "/about", label: "About" },
] as const;

const INDEXES = [
  { href: "/llms.txt", label: "llms.txt" },
  { href: "/feed.xml", label: "RSS" },
  { href: "/sitemap.xml", label: "Sitemap" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link
            href="/"
            className="site-footer-name"
            {...trackAttrs("footer_click", { label: "brand", href: "/" })}
          >
            {SITE_NAME}
          </Link>
          <p className="site-footer-tagline">{SITE_TAGLINE}</p>
        </div>

        <nav className="site-footer-nav" aria-label="Footer">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              {...trackAttrs("footer_click", {
                label: item.label,
                href: item.href,
              })}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <nav className="site-footer-indexes" aria-label="Machine indexes">
          {INDEXES.map((item) => (
            <a
              key={item.href}
              href={item.href}
              {...trackAttrs("footer_click", {
                label: item.label,
                href: item.href,
                kind: "index",
              })}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <p className="site-footer-copy">
          © {year} {SITE_NAME}. No accounts. Stars stay on your device.
        </p>
      </div>
    </footer>
  );
}
