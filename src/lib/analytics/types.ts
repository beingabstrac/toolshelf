/** Props allowed on any analytics event (JSON-serializable). */
export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined | string[]
>;

/**
 * Canonical event names. Prefer these over ad-hoc strings.
 * See ANALYTICS.md for funnel meaning and required props.
 */
export type AnalyticsEvent =
  // Lifecycle / views
  | "page_view"
  | "tool_view"
  | "search_view"
  | "aisle_view"
  | "drop_view"
  | "compare_view"
  | "saved_view"
  | "about_view"
  // Nav / chrome
  | "nav_click"
  | "brand_click"
  | "footer_click"
  // Discovery
  | "section_click"
  | "hero_cta_click"
  | "hero_marquee_click"
  | "aisle_click"
  | "tool_card_open"
  | "shelf_sort_change"
  | "shelf_filters_clear"
  | "shelf_load_more"
  | "search_filter_click"
  | "empty_cta_click"
  // Palette
  | "palette_open"
  | "palette_close"
  | "palette_query"
  | "palette_select"
  | "palette_clear"
  // Keyboard
  | "keyboard_shortcut"
  // Core conversions
  | "tool_visit"
  | "tool_save"
  | "tool_share"
  | "tool_share_abort"
  // Detail / compare / social proof
  | "category_chip_click"
  | "source_chip_click"
  | "mention_open"
  | "compare_peer_click"
  | "compare_pick"
  | "compare_swap"
  | "compare_full_page"
  | "related_tool_click"
  | "related_compare_click"
  | "related_browse_click"
  // Drop / about extras
  | "drop_archive_click"
  | "about_cta_click"
  | "about_board_click"
  | "about_index_click"
  | "saved_view_all";

export type AnalyticsPayload = {
  event: AnalyticsEvent | (string & {});
  props: AnalyticsProps;
  /** ISO timestamp */
  ts: string;
  /** Path without origin */
  path: string;
  /** Full URL when available */
  url?: string;
  /** document.referrer when available */
  referrer?: string;
};

export type AnalyticsSink = (payload: AnalyticsPayload) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
    toolshelfAnalytics?: {
      track: (event: string, props?: AnalyticsProps) => void;
      page: (props?: AnalyticsProps) => void;
      queue: AnalyticsPayload[];
      sinks: AnalyticsSink[];
    };
  }
}
