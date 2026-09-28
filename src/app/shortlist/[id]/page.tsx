import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import {
  shortlistFollowups,
  shortlists,
  trackSelections,
} from "@/lib/db/schema";
import type { ConsideredTrack, ToolCallTrace } from "@/components/SourcePanel";
import { extractTrackLinks } from "@/lib/track-links";
import { estimateCostUsd } from "@/lib/usage-cost";
import { ShortlistPageClient } from "./ShortlistPageClient";

function extractToolCalls(raw: unknown): ToolCallTrace[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c): ToolCallTrace | null => {
      if (!c || typeof c !== "object") return null;
      const o = c as Record<string, unknown>;
      return {
        toolCallId: (o.toolCallId as string | undefined) ?? "",
        toolName: (o.toolName as string | undefined) ?? "unknown",
        input: (o.input as Record<string, unknown> | undefined) ?? undefined,
        output: (o.output as Record<string, unknown> | undefined) ?? undefined,
      };
    })
    .filter((c): c is ToolCallTrace => c !== null);
}

/** Every track any tool call returned, deduped, shortlisted ones first. */
function consideredTracks(
  toolCalls: ToolCallTrace[],
  shortlisted: Set<string>,
): ConsideredTrack[] {
  const byId = new Map<string, ConsideredTrack>();
  for (const c of toolCalls) {
    const tracks = c.output?.tracks;
    if (!Array.isArray(tracks)) continue;
    for (const t of tracks as Array<Record<string, unknown>>) {
      const id = t.id as string | undefined;
      if (!id || byId.has(id)) continue;
      byId.set(id, {
        id,
        title: String(t.title ?? ""),
        artists: String(t.artists ?? ""),
        bpm: Number(t.bpm ?? 0),
        lengthSec: Number(t.lengthSec ?? 0),
        moods: Array.isArray(t.moods) ? (t.moods as string[]) : [],
        vocalType: String(t.vocalType ?? "NONE"),
        shortlisted: shortlisted.has(id),
      });
    }
  }
  return [...byId.values()].sort(
    (a, b) => Number(b.shortlisted) - Number(a.shortlisted),
  );
}

export default async function ShortlistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [shortlist] = await db
    .select()
    .from(shortlists)
    .where(eq(shortlists.id, id))
    .limit(1);
  if (!shortlist) notFound();

  const followups = await db
    .select()
    .from(shortlistFollowups)
    .where(eq(shortlistFollowups.shortlistId, shortlist.id))
    .orderBy(shortlistFollowups.createdAt);

  const selections = await db
    .select()
    .from(trackSelections)
    .where(eq(trackSelections.shortlistId, shortlist.id))
    .orderBy(trackSelections.createdAt);

  const picks = extractTrackLinks(shortlist.text);
  const toolCalls = [
    ...extractToolCalls(shortlist.toolCalls),
    ...followups.flatMap((f) => extractToolCalls(f.toolCalls)),
  ];

  return (
    <ShortlistPageClient
      shortlist={{
        id: shortlist.id,
        brief: shortlist.brief,
        text: shortlist.text,
        reasoning: shortlist.reasoning,
        finishReason: shortlist.finishReason,
        modelId: shortlist.modelId,
        durationMs: shortlist.durationMs,
        costUsd: estimateCostUsd(shortlist.usage),
      }}
      picks={picks}
      selections={selections.map((s) => ({
        trackId: s.trackId,
        platform: s.platform,
      }))}
      toolCalls={toolCalls}
      considered={consideredTracks(toolCalls, new Set(picks.map((p) => p.id)))}
      followups={followups.map((f) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
      }))}
    />
  );
}
