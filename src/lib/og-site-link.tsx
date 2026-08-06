import { OG_COLORS, OG_SITE_HOST } from "@/lib/og-style";

/** Globe + domain — bottom-right on every OG card (reads as a link). */
export function OgSiteLink({ size = 26 }: { size?: number }) {
  const icon = Math.round(size * 1.05);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: OG_COLORS.ink,
        fontSize: size,
        fontWeight: 700,
      }}
    >
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke={OG_COLORS.ink}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.8 2.8 4.2 5.7 4.2 9S14.8 18.2 12 21c-2.8-2.8-4.2-5.7-4.2-9S9.2 5.8 12 3z" />
      </svg>
      <span>{OG_SITE_HOST}</span>
    </div>
  );
}
