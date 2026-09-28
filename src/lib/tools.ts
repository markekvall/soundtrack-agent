import { tool } from "ai";
import { z } from "zod";
import {
  getHighlights as fetchHighlights,
  getPage as fetchPage,
  getSimilarTracks as fetchSimilar,
  listGenres as fetchGenres,
  listMoods as fetchMoods,
  searchTracks as fetchSearch,
} from "./es/endpoints";
import { EsApiError } from "./es/client";
import { VocalTypeSchema, type Track, type TrackListResponse } from "./es/schemas";

function asEsErrorPayload(err: unknown) {
  if (err instanceof EsApiError) {
    return {
      error: true,
      status: err.status,
      message:
        err.status === 404
          ? "Epidemic Sound returned 404 — the track id doesn't exist or isn't available to this partner."
          : err.body.slice(0, 300),
    };
  }
  return {
    error: true,
    message: err instanceof Error ? err.message : String(err),
  };
}

/** The fields the model needs to judge fit; drops images, ISRC, etc. */
export function condenseTrack(t: Track) {
  return {
    id: t.id,
    title: t.title,
    artists: [...t.mainArtists, ...t.featuredArtists].join(", "),
    bpm: t.bpm,
    lengthSec: t.length,
    moods: t.moods.map((m) => m.name),
    genres: t.genres.map((g) => g.name),
    vocalType: t.vocalType ?? (t.hasVocals ? "LEAD" : "NONE"),
    isExplicit: t.isExplicit ?? false,
    isPreviewOnly: t.isPreviewOnly ?? false,
  };
}

function condenseList(res: TrackListResponse) {
  return {
    count: res.tracks.length,
    offset: res.pagination.offset,
    tracks: res.tracks.map(condenseTrack),
    nextPageUrl: res.links.next ?? null,
    topMoods: res.aggregations?.moods.slice(0, 8) ?? [],
    topGenres: res.aggregations?.genres.slice(0, 8) ?? [],
  };
}

export const tools = {
  listMoods: tool({
    description:
      "List the mood taxonomy (id + name). Search filters take mood IDs, not names, so call this before filtering by mood.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const res = await fetchMoods();
        return { moods: res.moods.map((m) => ({ id: m.id, name: m.name })) };
      } catch (err) {
        return asEsErrorPayload(err);
      }
    },
  }),

  listGenres: tool({
    description:
      "List the genre taxonomy (id, name, parent genre). Search filters take genre IDs, not names.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const res = await fetchGenres();
        return {
          genres: res.genres.map((g) => ({
            id: g.id,
            name: g.name,
            parent: g.parent?.name ?? null,
          })),
        };
      } catch (err) {
        return asEsErrorPayload(err);
      }
    },
  }),

  searchTracks: tool({
    description:
      "Search the Epidemic Sound music catalogue. Combine a free-text `term` with mood/genre IDs, a BPM range and vocal type. Returns condensed tracks, mood/genre aggregations for the result set, and `nextPageUrl` when more results exist.",
    inputSchema: z.object({
      term: z.string().max(100).optional().describe("Free-text search, e.g. \"lo-fi piano\"."),
      mood: z.array(z.string()).optional().describe("Mood IDs from listMoods."),
      genre: z.array(z.string()).optional().describe("Genre IDs from listGenres."),
      bpmMin: z.number().int().min(40).max(220).optional(),
      bpmMax: z.number().int().min(40).max(220).optional(),
      vocalType: z
        .array(VocalTypeSchema)
        .optional()
        .describe("NONE = instrumental, PRESENCE = vocal chops/textures, LEAD = sung lead vocals."),
      limit: z.number().int().min(1).max(60).optional(),
    }),
    execute: async (input) => {
      try {
        return condenseList(await fetchSearch(input));
      } catch (err) {
        return asEsErrorPayload(err);
      }
    },
  }),

  getNextPage: tool({
    description:
      "Fetch the next page of a previous searchTracks or getSimilarTracks result. Pass the `nextPageUrl` from that result verbatim.",
    inputSchema: z.object({
      url: z.string().describe("Absolute URL from a previous result's nextPageUrl."),
    }),
    execute: async ({ url }) => {
      try {
        return condenseList(await fetchPage(url));
      } catch (err) {
        return asEsErrorPayload(err);
      }
    },
  }),

  getSimilarTracks: tool({
    description:
      "Tracks that sound similar to a given track. Use it to widen a shortlist around a strong candidate.",
    inputSchema: z.object({ trackId: z.string() }),
    execute: async ({ trackId }) => {
      try {
        return { trackId, ...condenseList(await fetchSimilar(trackId)) };
      } catch (err) {
        return asEsErrorPayload(err);
      }
    },
  }),

  getHighlights: tool({
    description:
      "The most-used segment of a track, optionally for a target duration in seconds. Use it to recommend where to cut a track for a short video.",
    inputSchema: z.object({
      trackId: z.string(),
      durationSec: z.number().int().min(5).max(300).optional(),
    }),
    execute: async ({ trackId, durationSec }) => {
      try {
        const res = await fetchHighlights(trackId, durationSec);
        return { trackId, highlights: res.highlights };
      } catch (err) {
        return asEsErrorPayload(err);
      }
    },
  }),
};

export type Tools = typeof tools;
