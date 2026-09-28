import { describe, expect, it, vi } from "vitest";

vi.mock("../db/client", () => ({ db: {} }));

const { cacheKey, toQueryString } = await import("./endpoints");

describe("toQueryString", () => {
  it("sorts keys so equivalent searches share a cache key", () => {
    expect(toQueryString({ term: "piano", bpmMin: 80 })).toBe(
      toQueryString({ bpmMin: 80, term: "piano" }),
    );
  });

  it("repeats array params in sorted order", () => {
    expect(toQueryString({ mood: ["happy", "epic"] })).toBe("mood=epic&mood=happy");
  });

  it("drops undefined and empty values", () => {
    expect(toQueryString({ term: "", bpmMin: undefined, limit: 20 })).toBe("limit=20");
  });
});

describe("cacheKey", () => {
  it("namespaces by endpoint", () => {
    expect(cacheKey("search", "term=x")).toBe("search:term=x");
  });
});
