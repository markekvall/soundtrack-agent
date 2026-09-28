import { eq } from "drizzle-orm";
import { anthropic } from "@ai-sdk/anthropic";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
  stepCountIs,
  streamText,
} from "ai";
import { z } from "zod";
import { aggregateStepToolCalls } from "@/lib/agent-utils";
import { db } from "@/lib/db/client";
import { shortlistFollowups, shortlists } from "@/lib/db/schema";
import { followupSystemPrompt } from "@/lib/prompt";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { tools } from "@/lib/tools";

// Token bucket: 10 follow-ups per minute per IP. Cheaper than a full
// shortlist (cached tools mean ~$0.02–0.05 each), so the limit is twice as
// permissive.
const ASK_CAPACITY = 10;
const ASK_REFILL_PER_SEC = 10 / 60;

export const runtime = "nodejs";
export const maxDuration = 120;

const RequestSchema = z.object({
  question: z.string().min(1).max(2000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const ip = getClientIp(req);
  const limit = rateLimit(`ask:${ip}`, ASK_CAPACITY, ASK_REFILL_PER_SEC);
  if (!limit.allowed) {
    return Response.json(
      {
        error: "Too many follow-up requests. Try again in a moment.",
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
  const { question } = parsed.data;

  const [shortlist] = await db
    .select()
    .from(shortlists)
    .where(eq(shortlists.id, id))
    .limit(1);
  if (!shortlist) {
    return Response.json({ error: "Shortlist not found" }, { status: 404 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set" },
      { status: 500 },
    );
  }

  const prior = await db
    .select()
    .from(shortlistFollowups)
    .where(eq(shortlistFollowups.shortlistId, id))
    .orderBy(shortlistFollowups.createdAt);

  const messages: ModelMessage[] = [
    ...prior.flatMap((qa) => [
      { role: "user" as const, content: qa.question },
      { role: "assistant" as const, content: qa.answer },
    ]),
    { role: "user" as const, content: question },
  ];

  const modelId = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const startedAt = Date.now();

  const stream = createUIMessageStream({
    onError: (err) => {
      console.error("[ask stream] error", { shortlistId: id, err });
      const message = err instanceof Error ? err.message : String(err);
      return `Follow-up failed: ${message.slice(0, 240)}`;
    },
    execute: async ({ writer }) => {
      const result = streamText({
        model: anthropic(modelId),
        system: followupSystemPrompt(shortlist.text, shortlist.brief),
        messages,
        tools,
        stopWhen: stepCountIs(8),
        onFinish: async ({ text, totalUsage, steps }) => {
          try {
            // Aggregate text across all steps; the final step is sometimes a
            // tool call without text, in which case we surface the agent's
            // running commentary so we capture *something* useful.
            const stepTexts =
              steps?.map((s) => s.text).filter((t): t is string => !!t) ?? [];
            const aggregated = text || stepTexts.join("\n\n");
            const finalAnswer = aggregated || "(no answer produced)";

            const toolCallLog = aggregateStepToolCalls(steps);

            await db.insert(shortlistFollowups).values({
              shortlistId: id,
              question,
              answer: finalAnswer,
              toolCalls: toolCallLog,
              usage: totalUsage ?? null,
              durationMs: Date.now() - startedAt,
            });
          } catch (err) {
            console.error(
              "[ask onFinish] Failed to persist follow-up for shortlist",
              id,
              err,
            );
          }
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
