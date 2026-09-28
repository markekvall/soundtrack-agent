import { describe, expect, it } from "vitest";
import { extractTrackLinks } from "./track-links";

describe("extractTrackLinks", () => {
  it("returns track links in order of first appearance", () => {
    const text = `| 1 | [Run the Line](track:Qm4tR8vNa1) |
| 2 | [Split Second](track:Lp2wZ6kHc3) |`;
    expect(extractTrackLinks(text)).toEqual([
      { id: "Qm4tR8vNa1", title: "Run the Line" },
      { id: "Lp2wZ6kHc3", title: "Split Second" },
    ]);
  });

  it("dedupes repeated links to the same track", () => {
    const text = "[A](track:t1) then [A again](track:t1) and [B](track:t2)";
    expect(extractTrackLinks(text).map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("ignores ordinary links", () => {
    expect(extractTrackLinks("[docs](https://example.com)")).toEqual([]);
  });
});
