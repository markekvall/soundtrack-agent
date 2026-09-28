import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetBucketsForTesting,
  getClientIp,
  rateLimit,
} from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    _resetBucketsForTesting();
    vi.useRealTimers();
  });

  it("allows the first N requests up to capacity", () => {
    // 5 tokens, refill at 0 (no refill during the test)
    for (let i = 0; i < 5; i++) {
      expect(rateLimit("k", 5, 0).allowed).toBe(true);
    }
  });

  it("rejects when the bucket is exhausted", () => {
    for (let i = 0; i < 5; i++) rateLimit("k", 5, 0);
    const result = rateLimit("k", 5, 0);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.retryAfterSec).toBeGreaterThan(0);
  });

  it("buckets are scoped per key", () => {
    for (let i = 0; i < 5; i++) rateLimit("a", 5, 0);
    expect(rateLimit("a", 5, 0).allowed).toBe(false);
    expect(rateLimit("b", 5, 0).allowed).toBe(true);
  });

  it("refills over time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    // 1 token, refill 1 token per second
    expect(rateLimit("k", 1, 1).allowed).toBe(true);
    expect(rateLimit("k", 1, 1).allowed).toBe(false);
    // Advance 2 seconds — bucket should be full again
    vi.advanceTimersByTime(2000);
    expect(rateLimit("k", 1, 1).allowed).toBe(true);
  });

  it("retryAfterSec is consistent with refill rate", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    rateLimit("k", 1, 1 / 60); // 1 token per 60s
    const result = rateLimit("k", 1, 1 / 60);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.retryAfterSec).toBeLessThanOrEqual(60);
  });
});

describe("getClientIp", () => {
  function req(headers: Record<string, string>) {
    return new Request("http://x.example/", { headers });
  }

  it("prefers x-forwarded-for (first entry)", () => {
    expect(getClientIp(req({ "x-forwarded-for": "1.2.3.4" }))).toBe("1.2.3.4");
    expect(
      getClientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })),
    ).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("falls back to 'local' with no proxy headers", () => {
    expect(getClientIp(req({}))).toBe("local");
  });
});
