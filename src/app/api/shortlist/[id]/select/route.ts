import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { shortlists, trackSelections } from "@/lib/db/schema";
import { EsApiError } from "@/lib/es/client";
import { reportUsage } from "@/lib/es/endpoints";
import { UsagePlatformSchema } from "@/lib/es/schemas";

export const runtime = "nodejs";

const RequestSchema = z.object({
  trackId: z.string().min(1).max(64),
  platform: UsagePlatformSchema,
});

/**
 * The user picked a track from the shortlist for their video. Reports the
 * export to Epidemic Sound (required by the partner agreement) and records
 * the selection.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
  const { trackId, platform } = parsed.data;

  const [shortlist] = await db
    .select({ id: shortlists.id })
    .from(shortlists)
    .where(eq(shortlists.id, id))
    .limit(1);
  if (!shortlist) {
    return Response.json({ error: "Shortlist not found" }, { status: 404 });
  }

  try {
    const report = await reportUsage({ trackIds: [trackId], platform });

    const [selection] = await db
      .insert(trackSelections)
      .values({
        shortlistId: id,
        trackId,
        platform,
        reportMessage: report.message,
      })
      .returning();

    return Response.json({ selection }, { status: 201 });
  } catch (err) {
    console.error("[select] failed", { shortlistId: id, trackId, err });
    const status = err instanceof EsApiError ? 502 : 500;
    return Response.json(
      { error: "Couldn't record the selection. Try again." },
      { status },
    );
  }
}
