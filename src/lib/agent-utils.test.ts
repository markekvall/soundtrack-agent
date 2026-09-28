import { describe, expect, it } from "vitest";
import { aggregateStepToolCalls } from "./agent-utils";

// AI SDK's `StepResult` is heavily typed; we only need the shape our helper
// touches, so we cast minimal mocks. Real tests would use a typed mock factory.
type MockStep = {
  toolCalls?: Array<{ toolCallId: string; toolName: string; input: unknown }>;
  toolResults?: Array<{ toolCallId: string; output: unknown }>;
};

function asSteps(steps: MockStep[]): Parameters<typeof aggregateStepToolCalls>[0] {
  return steps as unknown as Parameters<typeof aggregateStepToolCalls>[0];
}

describe("aggregateStepToolCalls", () => {
  it("returns [] for missing or empty step arrays", () => {
    expect(aggregateStepToolCalls(undefined)).toEqual([]);
    expect(aggregateStepToolCalls(asSteps([]))).toEqual([]);
  });

  it("pairs calls to their results across all steps", () => {
    const result = aggregateStepToolCalls(
      asSteps([
        {
          toolCalls: [
            { toolCallId: "a", toolName: "listMoods", input: {} },
            { toolCallId: "b", toolName: "searchTracks", input: { term: "piano" } },
          ],
          toolResults: [
            { toolCallId: "a", output: { moods: [] } },
            { toolCallId: "b", output: { count: 20 } },
          ],
        },
        {
          toolCalls: [
            { toolCallId: "c", toolName: "getHighlights", input: { trackId: "t1" } },
          ],
          toolResults: [{ toolCallId: "c", output: { highlights: [] } }],
        },
      ]),
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ toolName: "listMoods", output: { moods: [] } });
    expect(result[1]).toMatchObject({ toolName: "searchTracks", output: { count: 20 } });
    expect(result[2]).toMatchObject({ toolName: "getHighlights", output: { highlights: [] } });
  });

  it("preserves call ordering when results arrive interleaved", () => {
    const result = aggregateStepToolCalls(
      asSteps([
        {
          toolCalls: [
            { toolCallId: "1", toolName: "a", input: {} },
            { toolCallId: "2", toolName: "b", input: {} },
          ],
          // Results in reverse order — the helper should still pair correctly by id
          toolResults: [
            { toolCallId: "2", output: "B" },
            { toolCallId: "1", output: "A" },
          ],
        },
      ]),
    );
    expect(result.map((c) => c.toolName)).toEqual(["a", "b"]);
    expect(result.map((c) => c.output)).toEqual(["A", "B"]);
  });

  it("leaves output undefined for calls without a matching result", () => {
    const result = aggregateStepToolCalls(
      asSteps([
        {
          toolCalls: [{ toolCallId: "x", toolName: "stalled", input: {} }],
          toolResults: [],
        },
      ]),
    );
    expect(result[0]).toMatchObject({ toolName: "stalled", output: undefined });
  });

  it("strips underscore-prefixed fields from outputs", () => {
    const result = aggregateStepToolCalls(
      asSteps([
        {
          toolCalls: [
            { toolCallId: "1", toolName: "searchTracks", input: {} },
          ],
          toolResults: [
            {
              toolCallId: "1",
              output: {
                count: 1,
                tracks: [],
                _raw: "{...}",
                _fetchedAt: "2026-01-01",
              },
            },
          ],
        },
      ]),
    );
    const out = result[0].output as Record<string, unknown>;
    expect(out).toHaveProperty("count");
    expect(out).toHaveProperty("tracks");
    expect(out).not.toHaveProperty("_raw");
    expect(out).not.toHaveProperty("_fetchedAt");
  });

  it("recursively strips underscore fields from nested objects and arrays", () => {
    const result = aggregateStepToolCalls(
      asSteps([
        {
          toolCalls: [{ toolCallId: "1", toolName: "x", input: {} }],
          toolResults: [
            {
              toolCallId: "1",
              output: {
                docs: [
                  { id: "t1", _binary: "secret" },
                  { id: "t2", _binary: "secret2", nested: { _hidden: 1, kept: 2 } },
                ],
              },
            },
          ],
        },
      ]),
    );
    const out = result[0].output as { docs: Array<Record<string, unknown>> };
    expect(out.docs[0]).toEqual({ id: "t1" });
    expect(out.docs[1].id).toBe("t2");
    expect(out.docs[1]).not.toHaveProperty("_binary");
    expect(out.docs[1].nested).toEqual({ kept: 2 });
  });

  it("handles error outputs (drops underscore but preserves error fields)", () => {
    const result = aggregateStepToolCalls(
      asSteps([
        {
          toolCalls: [{ toolCallId: "1", toolName: "x", input: {} }],
          toolResults: [
            {
              toolCallId: "1",
              output: { error: true, status: 404, message: "not found" },
            },
          ],
        },
      ]),
    );
    expect(result[0].output).toEqual({ error: true, status: 404, message: "not found" });
  });
});
