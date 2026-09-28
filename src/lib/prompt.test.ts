import { describe, expect, it } from "vitest";
import { followupSystemPrompt, PROMPT_VERSION, systemPrompt } from "./prompt";
import { tools } from "./tools";

describe("PROMPT_VERSION", () => {
  it("is a non-empty string", () => {
    expect(typeof PROMPT_VERSION).toBe("string");
    expect(PROMPT_VERSION.length).toBeGreaterThan(0);
  });
});

describe("systemPrompt", () => {
  it("describes every registered tool", () => {
    for (const name of Object.keys(tools)) {
      expect(systemPrompt).toContain(name);
    }
  });

  it("instructs the agent to produce the expected section headings", () => {
    expect(systemPrompt).toContain("## Brief");
    expect(systemPrompt).toContain("## Shortlist");
    expect(systemPrompt).toContain("## Why these");
    expect(systemPrompt).toContain("## Watch out for");
  });

  it("teaches the track link format the renderer expects", () => {
    expect(systemPrompt).toContain("[Title](track:TRACK_ID)");
  });
});

describe("followupSystemPrompt", () => {
  it("embeds the shortlist text and the original brief", () => {
    const shortlist = "## Brief\nUpbeat teaser.\n\n## Shortlist\n| 1 | [Run the Line](track:abc) |";
    const brief = "30-second teaser for a running shoe";
    const prompt = followupSystemPrompt(shortlist, brief);

    expect(prompt).toContain(shortlist);
    expect(prompt).toContain(brief);
  });

  it("tells the agent its tools are cached", () => {
    expect(followupSystemPrompt("s", "b")).toMatch(/cache/i);
  });

  it("asks for no preamble", () => {
    expect(followupSystemPrompt("s", "b")).toMatch(/no preamble/i);
  });
});
