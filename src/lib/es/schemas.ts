import { z } from "zod";

// Shapes follow the Partner Content API OpenAPI spec
// (https://partner-content-api.epidemicsound.com/docs/spec.json). The API
// returns more fields than we declare; `.loose()` keeps them on the parsed
// value instead of stripping them.

const NamedRefSchema = z.object({ id: z.string(), name: z.string() }).loose();

export const GenreRefSchema = NamedRefSchema.extend({
  parent: NamedRefSchema.optional(),
});

export const VocalTypeSchema = z.enum(["LEAD", "PRESENCE", "NONE"]);

export const TrackSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    mainArtists: z.array(z.string()).default([]),
    featuredArtists: z.array(z.string()).default([]),
    bpm: z.number().int(),
    /** Seconds. */
    length: z.number().int(),
    moods: z.array(NamedRefSchema).default([]),
    genres: z.array(GenreRefSchema).default([]),
    hasVocals: z.boolean(),
    vocalType: VocalTypeSchema.optional(),
    isExplicit: z.boolean().optional(),
    isPreviewOnly: z.boolean().optional(),
    tierOption: z.enum(["PAID", "FREE"]).optional(),
    added: z.string().optional(),
    waveformUrl: z.string().optional(),
  })
  .loose();

const PaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

const LinksSchema = z.object({
  next: z.string().nullish(),
  prev: z.string().nullish(),
});

const AggregationSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number().int(),
});

export const TrackListResponseSchema = z.object({
  tracks: z.array(TrackSchema),
  pagination: PaginationSchema,
  links: LinksSchema.default({}),
  aggregations: z
    .object({
      moods: z.array(AggregationSchema).default([]),
      genres: z.array(AggregationSchema).default([]),
    })
    .optional(),
});

export const MoodsResponseSchema = z.object({
  moods: z.array(NamedRefSchema),
  pagination: PaginationSchema,
  links: LinksSchema.default({}),
});

export const GenresResponseSchema = z.object({
  genres: z.array(GenreRefSchema),
  pagination: PaginationSchema,
  links: LinksSchema.default({}),
});

export const HighlightsResponseSchema = z.object({
  highlights: z.array(
    z.object({
      from: z.number().int(),
      to: z.number().int(),
      duration: z.number().int(),
    }),
  ),
});

export const StreamResponseSchema = z.object({
  url: z.url(),
  expires: z.string(),
});

export const UsagePlatformSchema = z.enum([
  "YOUTUBE",
  "TWITTER",
  "TWITCH",
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
  "OTHER",
  "LOCAL",
]);

export const UsageResponseSchema = z.object({
  message: z.string(),
  errors: z
    .array(z.object({ key: z.string(), messages: z.array(z.string()) }))
    .optional(),
});

export type Track = z.infer<typeof TrackSchema>;
export type TrackListResponse = z.infer<typeof TrackListResponseSchema>;
export type MoodsResponse = z.infer<typeof MoodsResponseSchema>;
export type GenresResponse = z.infer<typeof GenresResponseSchema>;
export type HighlightsResponse = z.infer<typeof HighlightsResponseSchema>;
export type StreamResponse = z.infer<typeof StreamResponseSchema>;
export type UsagePlatform = z.infer<typeof UsagePlatformSchema>;
export type UsageResponse = z.infer<typeof UsageResponseSchema>;
export type VocalType = z.infer<typeof VocalTypeSchema>;
