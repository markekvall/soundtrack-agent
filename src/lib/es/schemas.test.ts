import { describe, expect, it } from "vitest";
import {
  HighlightsResponseSchema,
  StreamResponseSchema,
  TrackListResponseSchema,
  TrackSchema,
  UsagePlatformSchema,
} from "./schemas";

const track = {
  id: "Qm4tR8vNa1",
  title: "Run the Line",
  mainArtists: ["Halden Park"],
  featuredArtists: [],
  bpm: 128,
  length: 162,
  moods: [{ id: "energetic", name: "Energetic" }],
  genres: [{ id: "house", name: "House", parent: { id: "electronic", name: "Electronic" } }],
  hasVocals: false,
  vocalType: "NONE",
  isExplicit: false,
  isPreviewOnly: false,
  tierOption: "PAID",
  images: { default: "https://example.com/a.jpg" },
};

describe("TrackSchema", () => {
  it("accepts a spec-shaped track and keeps unknown fields", () => {
    const parsed = TrackSchema.parse(track);
    expect(parsed.bpm).toBe(128);
    expect(parsed).toHaveProperty("images");
  });

  it("defaults missing artist and taxonomy arrays", () => {
    const rest: Record<string, unknown> = { ...track };
    for (const key of ["mainArtists", "featuredArtists", "moods", "genres"]) delete rest[key];
    const parsed = TrackSchema.parse(rest);
    expect(parsed.mainArtists).toEqual([]);
    expect(parsed.moods).toEqual([]);
  });

  it("rejects an unknown vocal type", () => {
    expect(() => TrackSchema.parse({ ...track, vocalType: "CHOIR" })).toThrow();
  });
});

describe("TrackListResponseSchema", () => {
  it("accepts a paginated list with a null next link", () => {
    const parsed = TrackListResponseSchema.parse({
      tracks: [track],
      pagination: { page: 1, limit: 20, offset: 0 },
      links: { next: null, prev: null },
      aggregations: { moods: [{ id: "energetic", name: "Energetic", count: 1 }], genres: [] },
    });
    expect(parsed.tracks).toHaveLength(1);
    expect(parsed.links.next).toBeNull();
  });

  it("defaults links when the API omits them", () => {
    const parsed = TrackListResponseSchema.parse({
      tracks: [],
      pagination: { page: 1, limit: 20, offset: 0 },
    });
    expect(parsed.links).toEqual({});
  });
});

describe("HighlightsResponseSchema", () => {
  it("accepts highlight segments", () => {
    const parsed = HighlightsResponseSchema.parse({
      highlights: [{ from: 50, to: 80, duration: 30 }],
    });
    expect(parsed.highlights[0].duration).toBe(30);
  });
});

describe("StreamResponseSchema", () => {
  it("requires an absolute URL", () => {
    expect(() => StreamResponseSchema.parse({ url: "/relative", expires: "x" })).toThrow();
  });
});

describe("UsagePlatformSchema", () => {
  it("only accepts platforms the usage endpoint knows", () => {
    expect(UsagePlatformSchema.parse("YOUTUBE")).toBe("YOUTUBE");
    expect(() => UsagePlatformSchema.parse("VIMEO")).toThrow();
  });
});
