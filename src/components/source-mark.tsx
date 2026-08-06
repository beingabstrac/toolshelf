import type { Source } from "@/lib/db/schema";
import { SOURCE_LABELS, cn } from "@/lib/utils";

type SourceKey = Source | string;

/** Compact brand marks for launch boards. */
export function SourceMark({
  source,
  className,
}: {
  source: SourceKey;
  className?: string;
}) {
  const common = {
    className: cn("source-mark", className),
    viewBox: "0 0 16 16",
    width: 14,
    height: 14,
    "aria-hidden": true as const,
    focusable: false as const,
  };

  switch (source) {
    case "hackernews":
      return (
        <svg {...common}>
          <rect width="16" height="16" rx="2.5" fill="#ff6600" />
          <path
            d="M4.2 3.4h2.1l1.7 3.4 1.7-3.4h2.1L8.9 8.2V12.6H7.1V8.2L4.2 3.4z"
            fill="#fff"
          />
        </svg>
      );
    case "producthunt":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="8" fill="#da552f" />
          <path
            d="M7 4.4h2.1c1.7 0 2.8 1 2.8 2.5S10.8 9.4 9.1 9.4H7.9V12H6.2V4.4H7zm.9 3.6h1c.7 0 1.2-.4 1.2-1.1S9.6 5.8 8.9 5.8h-1V8z"
            fill="#fff"
          />
        </svg>
      );
    case "lobsters":
      return (
        <svg {...common}>
          <rect width="16" height="16" rx="3" fill="#ac130d" />
          <path
            d="M4.2 10.8c.4-2.2 1.6-3.6 3.5-4.1-.5-.4-.8-1-.8-1.7 0-1.2 1-2.1 2.2-2.1s2.2.9 2.2 2.1c0 .7-.3 1.3-.8 1.7 1.9.5 3.1 1.9 3.5 4.1H4.2zm3.9-6.5c-.4 0-.7.3-.7.7s.3.7.7.7.7-.3.7-.7-.3-.7-.7-.7z"
            fill="#fff"
          />
        </svg>
      );
    case "reddit":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="8" fill="#ff4500" />
          <circle cx="5.6" cy="8.2" r="1.15" fill="#fff" />
          <circle cx="10.4" cy="8.2" r="1.15" fill="#fff" />
          <path
            d="M5.7 10c.7.6 1.5.9 2.3.9s1.6-.3 2.3-.9"
            fill="none"
            stroke="#fff"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <circle cx="12.2" cy="5.4" r="1" fill="#fff" />
          <path
            d="M10.6 4.2c.2 1 .8 1.7 1.6 2"
            fill="none"
            stroke="#fff"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
      );
    case "uneed":
      return (
        <svg {...common}>
          <rect width="16" height="16" rx="4" fill="#5b4dff" />
          <path
            d="M5 4.2h1.7v4.3c0 1.1.5 1.7 1.4 1.7s1.4-.6 1.4-1.7V4.2H11.2v4.4c0 2.1-1.2 3.3-3.1 3.3S5 10.7 5 8.6V4.2z"
            fill="#fff"
          />
        </svg>
      );
    case "devhunt":
      return (
        <svg {...common}>
          <rect width="16" height="16" rx="3" fill="#111827" />
          <path
            d="M4.2 8 6.8 5.4l1 1-1.6 1.6 1.6 1.6-1 1L4.2 8zm7.6 0L9.2 5.4l-1 1 1.6 1.6-1.6 1.6 1 1L11.8 8z"
            fill="#22d3ee"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.35" />
          <circle cx="8" cy="8" r="2.2" fill="currentColor" />
        </svg>
      );
  }
}

/** Icon + label for chips, filters, and trails. */
export function SourceName({
  source,
  className,
  label,
}: {
  source: SourceKey;
  className?: string;
  label?: string;
}) {
  return (
    <span className={cn("source-name", className)}>
      <SourceMark source={source} />
      <span>{label ?? SOURCE_LABELS[source] ?? source}</span>
    </span>
  );
}
