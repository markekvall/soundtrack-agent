type LanguageModelUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

/** Rough LLM spend at Sonnet list prices ($3 / $15 per million tokens). */
export function estimateCostUsd(usage: unknown): number | null {
  if (!usage || typeof usage !== "object") return null;
  const u = usage as LanguageModelUsage;
  // If neither token count is recorded, we have no real signal — return null
  // so the UI can show "cost unavailable" rather than a misleading $0.000.
  if (u.inputTokens == null && u.outputTokens == null) return null;
  const inputUsd = ((u.inputTokens ?? 0) / 1_000_000) * 3;
  const outputUsd = ((u.outputTokens ?? 0) / 1_000_000) * 15;
  return inputUsd + outputUsd;
}
