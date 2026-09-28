import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export type CachedEndpoint =
  | "moods"
  | "genres"
  | "search"
  | "page"
  | "similar"
  | "highlights";

/**
 * Read-through cache for the JSON-shaped Epidemic Sound endpoints. The key
 * is the endpoint plus its canonicalised query (see `cacheKey` in
 * endpoints.ts), so two searches with the same filters share a row.
 */
export const cachedResponses = pgTable(
  "cached_responses",
  {
    cacheKey: text("cache_key").primaryKey(),
    endpoint: text("endpoint").$type<CachedEndpoint>().notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [index("idx_cached_responses_endpoint").on(table.endpoint)],
);

export const shortlists = pgTable(
  "shortlists",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    brief: text("brief").notNull(),
    videoLengthSec: integer("video_length_sec"),
    text: text("text").notNull(),
    reasoning: text("reasoning"),
    toolCalls: jsonb("tool_calls").$type<unknown>(),
    finishReason: text("finish_reason"),
    modelId: text("model_id").notNull(),
    promptVersion: text("prompt_version").notNull(),
    usage: jsonb("usage").$type<unknown>(),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_shortlists_created_at").on(table.createdAt)],
);

export const shortlistFollowups = pgTable(
  "shortlist_followups",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    shortlistId: uuid("shortlist_id")
      .notNull()
      .references(() => shortlists.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    toolCalls: jsonb("tool_calls").$type<unknown>(),
    usage: jsonb("usage").$type<unknown>(),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_shortlist_followups_shortlist_id").on(
      table.shortlistId,
      table.createdAt,
    ),
  ],
);

/**
 * A track the user picked from a shortlist. Each row corresponds to one
 * `POST /v0/usage` report to Epidemic Sound, which is what the partner
 * agreement bills against.
 */
export const trackSelections = pgTable(
  "track_selections",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    shortlistId: uuid("shortlist_id")
      .notNull()
      .references(() => shortlists.id, { onDelete: "cascade" }),
    trackId: text("track_id").notNull(),
    platform: text("platform").notNull(),
    reportMessage: text("report_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_track_selections_shortlist_id").on(table.shortlistId)],
);

export type Shortlist = typeof shortlists.$inferSelect;
export type NewShortlist = typeof shortlists.$inferInsert;
export type CachedResponse = typeof cachedResponses.$inferSelect;
export type ShortlistFollowup = typeof shortlistFollowups.$inferSelect;
export type TrackSelection = typeof trackSelections.$inferSelect;
