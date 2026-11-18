import { integer, jsonb, pgTable, primaryKey, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

/** Metrics a Source reports for an Item, such as points and comments; the keys differ per Source. */
export type Metrics = Record<string, number>;

export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  /** The language a Regional Source belongs to; null for every other Source. */
  regionalLanguage: text("regional_language"),
  lastSucceededAt: timestamp("last_succeeded_at", { withTimezone: true }),
  lastError: text("last_error"),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
});

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    /** The Item's own id on its Source, such as the HN story id. */
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    contentLanguage: text("content_language"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** Metrics as of the latest ingest. */
    metrics: jsonb("metrics").$type<Metrics>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [unique("items_source_external_id").on(t.sourceId, t.externalId)],
);

/** The current Source Ranking per Source, Time Window and filter: one row per rank, replaced whole by each ingest. */
export const sourceRankings = pgTable(
  "source_rankings",
  {
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    timeWindow: text("time_window", { enum: ["day", "week"] }).notNull(),
    /** An optional filter such as a GitHub language; empty when the ranking is unfiltered. */
    filter: text("filter").notNull().default(""),
    rank: integer("rank").notNull(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    /** Metrics as they stood when this ranking was fetched. */
    metrics: jsonb("metrics").$type<Metrics>().notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.sourceId, t.timeWindow, t.filter, t.rank] })],
);
