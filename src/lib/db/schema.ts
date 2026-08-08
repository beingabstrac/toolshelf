import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const TOOL_CATEGORIES = [
  "dev-tools",
  "design",
  "product",
  "ai",
  "infra",
  "data",
  "no-code",
  "marketing",
  "security",
  "collaboration",
  "other-tools",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

/** Launch / discussion sources we ingest from */
export const SOURCES = [
  "hackernews",
  "producthunt",
  "lobsters",
  "reddit",
  "uneed",
  "devhunt",
] as const;
export type Source = (typeof SOURCES)[number];

export const tools = pgTable(
  "tools",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    summary: text("summary").notNull(),
    categories: text("categories").array().notNull().default([]),
    sources: text("sources").array().notNull().default([]),
    pricing: text("pricing").notNull().default("unknown"),
    logoUrl: text("logo_url"),
    previewImageUrl: text("preview_image_url"),
    brandColor: text("brand_color"),
    features: text("features").array().notNull().default([]),
    /** unknown | ok | broken — from soft HEAD/GET health checks */
    urlStatus: text("url_status").notNull().default("unknown"),
    urlCheckedAt: timestamp("url_checked_at", { withTimezone: true }),
    /** Short classifier note for why this tool belongs on the shelf */
    inclusionReason: text("inclusion_reason"),
    // Physical column names kept for existing Neon data
    firstSeenAt: timestamp("hn_first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    scorePeak: integer("hn_points_peak").notNull().default(0),
    commentsPeak: integer("hn_comments_peak").notNull().default(0),
    status: text("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("tools_slug_idx").on(t.slug),
    uniqueIndex("tools_url_idx").on(t.url),
    index("tools_first_seen_idx").on(t.firstSeenAt),
  ],
);

/** One row per source post/thread that pointed at a tool */
export const sourceMentions = pgTable(
  "hn_mentions",
  {
    id: serial("id").primaryKey(),
    toolId: integer("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("hackernews"),
    // Physical column kept; uniqueness is (source, externalId)
    externalId: text("hn_object_id").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    permalink: text("permalink"),
    score: integer("points").notNull().default(0),
    numComments: integer("num_comments").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    isShowHn: boolean("is_show_hn").notNull().default(false),
  },
  (t) => [
    uniqueIndex("source_mentions_source_external_idx").on(
      t.source,
      t.externalId,
    ),
    index("hn_mentions_tool_idx").on(t.toolId),
  ],
);

export const candidates = pgTable(
  "candidates",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull().default("hackernews"),
    // Physical column kept; uniqueness is (source, externalId)
    externalId: text("hn_object_id").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    author: text("author"),
    points: integer("points").notNull().default(0),
    numComments: integer("num_comments").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    isShowHn: boolean("is_show_hn").notNull().default(false),
    sourceStream: text("source_stream").notNull(),
    payload: jsonb("payload").notNull().default({}),
    decision: text("decision").notNull().default("pending"),
    classification: jsonb("classification"),
    confidence: real("confidence"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdRowAt: timestamp("created_row_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("candidates_source_external_idx").on(t.source, t.externalId),
    index("candidates_decision_idx").on(t.decision),
  ],
);

export const ingestionCursors = pgTable("ingestion_cursors", {
  id: serial("id").primaryKey(),
  stream: text("stream").notNull().unique(),
  untilTs: integer("until_ts").notNull(),
  lastObjectId: text("last_object_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type SourceMention = typeof sourceMentions.$inferSelect;

/** @deprecated use SourceMention */
export type HnMention = SourceMention;
