import { getStreamUrl } from "@/lib/es/endpoints";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Audio preview for the shortlist page. The stream endpoint needs our API
 * key, so the browser can't call it directly; we resolve the signed URL
 * server-side and relay the audio.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trackId = searchParams.get("trackId");

  if (!trackId || !/^[A-Za-z0-9_-]{1,64}$/.test(trackId)) {
    return Response.json(
      { error: "Missing or malformed 'trackId' query parameter" },
      { status: 400 },
    );
  }

  try {
    const { url } = await getStreamUrl(trackId);
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return Response.json(
        { error: `Preview fetch failed with ${upstream.status}` },
        { status: 502 },
      );
    }
    const bytes = Buffer.from(await upstream.arrayBuffer());

    return new Response(bytes, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: "Failed to fetch preview",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
