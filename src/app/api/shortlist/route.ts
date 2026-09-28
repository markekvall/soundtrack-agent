import { randomUUID } from "node:crypto";
import { anthropic } from "@ai-sdk/anthropic";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from "ai";
import { z } from "zod";
import { aggregateStepToolCalls } from "@/lib/agent-utils";
import { db } from "@/lib/db/client";
import { shortlists } from "@/lib/db/schema";
import { PROMPT_VERSION, systemPrompt } from "@/lib/prompt";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { tools } from "@/lib/tools";

// Token bucket: 5 shortlists per minute per IP. Each run costs ~$0.10, so
// this caps a hostile client at ~$0.50/min of LLM spend. Burst capacity = 5.
const SHORTLIST_CAPACITY = 5;
const SHORTLIST_REFILL_PER_SEC = 5 / 60;

export const runtime = "nodejs";
export const maxDuration = 120;

const RequestSchema = z.object({
  brief: z.string().min(10).max(1000),
  videoLengthSec: z.number().int().min(5).max(3600).optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = rateLimit(
    `shortlist:${ip}`,
    SHORTLIST_CAPACITY,
    SHORTLIST_REFILL_PER_SEC,
  );
  if (!limit.allowed) {
    return Response.json(
      {
        error: "Too many shortlist requests. Try again in a moment.",
        retryAfter: limit.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { brief, videoLengthSec } = parsed.data;

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set" },
      { status: 500 },
    );
  }

  const shortlistId = randomUUID();
  const modelId = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const startedAt = Date.now();

  const stream = createUIMessageStream({
    onError: (err) => {
      console.error("[shortlist stream] error", { shortlistId, err });
      const message = err instanceof Error ? err.message : String(err);
      // The string returned here is forwarded to the client as a stream-error
      // event. Don't leak provider-specific stack traces; just the high-level
      // cause is enough for the user-facing toast.
      return `Generation failed: ${message.slice(0, 240)}`;
    },
    execute: async ({ writer }) => {
      // Send the shortlist ID upfront so the client can navigate to /shortlist/{id} after finish.
      writer.write({
        type: "data-shortlist-id",
        data: { id: shortlistId },
        transient: true,
      });

      const result = streamText({
        model: anthropic(modelId),
        system: systemPrompt,
        prompt:
          `Video brief:\n\n${brief}` +
          (videoLengthSec ? `\n\nVideo length: ${videoLengthSec} seconds.` : ""),
        tools,
        stopWhen: stepCountIs(15),
        onFinish: async ({ text, totalUsage, steps, finishReason }) => {
          try {
            // Split agent commentary from the shortlist itself. The shortlist
            // starts with `## Brief` per the system prompt's section structure.
            const briefIdx = text.indexOf("## Brief");
            const reasoning =
              briefIdx > 0 ? text.slice(0, briefIdx).trim() : null;
            const shortlistText = briefIdx > 0 ? text.slice(briefIdx) : text;

            const toolCallLog = aggregateStepToolCalls(steps);

            await db.insert(shortlists).values({
              id: shortlistId,
              brief,
              videoLengthSec: videoLengthSec ?? null,
              text: shortlistText,
              reasoning,
              modelId,
              promptVersion: PROMPT_VERSION,
              usage: totalUsage ?? null,
              toolCalls: toolCallLog,
              finishReason: finishReason ?? null,
              durationMs: Date.now() - startedAt,
            });
          } catch (err) {
            console.error("Failed to persist shortlist", shortlistId, err);
          }
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
