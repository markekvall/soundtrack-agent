import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../db/client";
import { cachedResponses, type CachedEndpoint } from "../db/schema";
import { esFetch } from "./client";
import {
  GenresResponseSchema,
  HighlightsResponseSchema,
  MoodsResponseSchema,
  StreamResponseSchema,
  TrackListResponseSchema,
  UsageResponseSchema,
  type GenresResponse,
  type HighlightsResponse,
  type MoodsResponse,
  type StreamResponse,
  type TrackListResponse,
  type UsagePlatform,
  type UsageResponse,
  type VocalType,
} from "./schemas";

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

type QueryValue = string | number | string[] | undefined;

/** Sorted, URL-encoded query string, so `{a, b}` and `{b, a}` share a key. */
export function toQueryString(params: Record<string, QueryValue>): string {
  const qs = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of [...value].sort()) qs.append(key, v);
    } else {
      qs.append(key, String(value));
    }
  }
  return qs.toString();
}

export function cacheKey(endpoint: CachedEndpoint, suffix: string): string {
  return `${endpoint}:${suffix}`;
}

async function cached<T>(
  endpoint: CachedEndpoint,
  suffix: string,
  schema: z.ZodType<T>,
  fetcher: () => Promise<Response>,
): Promise<T> {
  const key = cacheKey(endpoint, suffix);
  const [row] = await db
    .select()
    .from(cachedResponses)
    .where(eq(cachedResponses.cacheKey, key))
    .limit(1);
  if (row) return schema.parse(row.payload);

  const res = await fetcher();
  const parsed = schema.parse(await res.json());
  await db
    .insert(cachedResponses)
    .values({ cacheKey: key, endpoint, payload: parsed })
    .onConflictDoNothing();
  return parsed;
}

// ---------------------------------------------------------------------------
// Catalogue (read-through cache)
// ---------------------------------------------------------------------------

export async function listMoods(): Promise<MoodsResponse> {
  return cached("moods", "all", MoodsResponseSchema, () =>
    esFetch("/v0/moods?limit=60"),
  );
}

export async function listGenres(): Promise<GenresResponse> {
  return cached("genres", "all", GenresResponseSchema, () =>
    esFetch("/v0/genres?limit=60"),
  );
}

export type SearchParams = {
  term?: string;
  mood?: string[];
  genre?: string[];
  bpmMin?: number;
  bpmMax?: number;
  vocalType?: VocalType[];
  limit?: number;
};

export async function searchTracks(
  params: SearchParams,
): Promise<TrackListResponse> {
  const qs = toQueryString({ ...params, limit: params.limit ?? 20 });
  return cached("search", qs, TrackListResponseSchema, () =>
    esFetch(`/v0/tracks/search?${qs}`),
  );
}

/** Follow a `links.next` / `links.prev` URL from a previous list response. */
export async function getPage(url: string): Promise<TrackListResponse> {
  return cached("page", url, TrackListResponseSchema, () => esFetch(url));
}

export async function getSimilarTracks(
  trackId: string,
): Promise<TrackListResponse> {
  return cached("similar", trackId, TrackListResponseSchema, () =>
    esFetch(`/v0/tracks/${encodeURIComponent(trackId)}/similar?limit=10`),
  );
}

export async function getHighlights(
  trackId: string,
  durationSec?: number,
): Promise<HighlightsResponse> {
  const qs = toQueryString({ duration: durationSec });
  return cached(
    "highlights",
    `${trackId}?${qs}`,
    HighlightsResponseSchema,
    () =>
      esFetch(
        `/v0/tracks/${encodeURIComponent(trackId)}/highlights${qs ? `?${qs}` : ""}`,
      ),
  );
}

// ---------------------------------------------------------------------------
// Uncached: signed URLs expire, and usage reports are writes.
// ---------------------------------------------------------------------------

export async function getStreamUrl(trackId: string): Promise<StreamResponse> {
  const res = await esFetch(
    `/v0/tracks/${encodeURIComponent(trackId)}/stream`,
  );
  return StreamResponseSchema.parse(await res.json());
}

export async function reportUsage(input: {
  trackIds: string[];
  platform: UsagePlatform;
}): Promise<UsageResponse> {
  const res = await esFetch("/v0/usage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventType: "EXPORTED",
      platform: input.platform,
      trackIds: input.trackIds,
    }),
  });
  return UsageResponseSchema.parse(await res.json());
}
