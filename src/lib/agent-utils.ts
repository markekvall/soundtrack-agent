import type { StepResult, ToolSet } from "ai";

export type ToolCallLogEntry = {
  toolCallId: string;
  toolName: string;
  input: unknown;
  output: unknown;
};

/**
 * Aggregate tool calls + their outputs across every step of a streamText run.
 *
 * `OnFinishEvent.toolCalls` is the last step's calls only — useless for an
 * audit trail. The full trace lives in `steps[*]`. This pairs each call to
 * its matching tool result by `toolCallId` and sanitises outputs (drops any
 * underscore-prefixed fields, which tools use for internal data that
 * shouldn't bloat the saved row).
 */
export function aggregateStepToolCalls<T extends ToolSet>(
  steps: StepResult<T>[] | undefined,
): ToolCallLogEntry[] {
  if (!steps?.length) return [];

  const calls = steps.flatMap((s) => s.toolCalls ?? []);
  const results = steps.flatMap((s) => s.toolResults ?? []);
  const resultByCallId = new Map<string, unknown>();
  for (const r of results as Array<{ toolCallId: string; output: unknown }>) {
    resultByCallId.set(r.toolCallId, r.output);
  }

  return (
    calls as Array<{ toolCallId: string; toolName: string; input: unknown }>
  ).map((c) => ({
    toolCallId: c.toolCallId,
    toolName: c.toolName,
    input: c.input,
    output: sanitizeOutput(resultByCallId.get(c.toolCallId)),
  }));
}

function sanitizeOutput(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(sanitizeOutput);
  if (typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k.startsWith("_")) continue; // drop internal fields
    result[k] = sanitizeOutput(v);
  }
  return result;
}
