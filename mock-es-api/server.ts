/**
 * Local stand-in for the Epidemic Sound Partner Content API, so the app runs
 * without partner credentials. Implements the handful of endpoints the app
 * uses, with the same paths and response shapes as the real spec, plus the
 * real API's failure modes: bearer-key auth, a per-key rate limit, and
 * occasional 503s.
 *
 *   pnpm mock          # http://localhost:4010
 *
 * Env: MOCK_PORT (4010), MOCK_API_KEY (epidemic_mock_local-key),
 * MOCK_RATE_LIMIT_PER_MIN (60), MOCK_FAILURE_RATE (0.03).
 */
import { createHmac } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { GENRES, MOODS, TRACKS, type CatalogTrack, type VocalType } from "./catalog";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const API_KEY = process.env.MOCK_API_KEY ?? "epidemic_mock_local-key";
const RATE_LIMIT_PER_MIN = Number(process.env.MOCK_RATE_LIMIT_PER_MIN ?? 60);
const FAILURE_RATE = Number(process.env.MOCK_FAILURE_RATE ?? 0.03);
const SIGNING_SECRET = "mock-signing-secret";

type UsageReport = { receivedAt: string; eventType: string; platform: string; trackIds: string[] };
const usageReports: UsageReport[] = [];
const requestLog = new Map<string, number[]>();

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function origin(req: IncomingMessage): string {
  return `http://${req.headers.host ?? `localhost:${PORT}`}`;
}

function toApiTrack(t: CatalogTrack, base: string) {
  return {
    id: t.id,
    title: t.title,
    mainArtists: t.mainArtists,
    featuredArtists: t.featuredArtists,
    bpm: t.bpm,
    length: t.length,
    moods: t.moods,
    genres: t.genres,
    images: { default: `${base}/images/${t.id}.jpg` },
    waveformUrl: `${base}/waveforms/${t.id}.json`,
    hasVocals: t.vocalType !== "NONE",
    vocalType: t.vocalType,
    isExplicit: t.isExplicit,
    isPreviewOnly: t.isPreviewOnly,
    tierOption: "PAID",
    added: t.added,
  };
}

function paginate(
  req: IncomingMessage,
  url: URL,
  all: CatalogTrack[],
) {
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 60);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
  const base = origin(req);
  const page = all.slice(offset, offset + limit);

  const link = (o: number) => {
    const u = new URL(url.pathname + url.search, base);
    u.searchParams.set("offset", String(o));
    u.searchParams.set("limit", String(limit));
    return u.toString();
  };

  const count = (key: "moods" | "genres") => {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    for (const t of all) {
      for (const x of t[key]) {
        const c = counts.get(x.id) ?? { id: x.id, name: x.name, count: 0 };
        c.count++;
        counts.set(x.id, c);
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  };

  return {
    tracks: page.map((t) => toApiTrack(t, base)),
    pagination: { page: Math.floor(offset / limit) + 1, limit, offset },
    links: {
      next: offset + limit < all.length ? link(offset + limit) : null,
      prev: offset > 0 ? link(Math.max(offset - limit, 0)) : null,
    },
    aggregations: { moods: count("moods"), genres: count("genres") },
  };
}

function search(url: URL): CatalogTrack[] {
  const p = url.searchParams;
  const terms = (p.get("term") ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const moods = p.getAll("mood");
  const genres = p.getAll("genre");
  const vocalTypes = p.getAll("vocalType") as VocalType[];
  const bpmMin = p.has("bpmMin") ? Number(p.get("bpmMin")) : -Infinity;
  const bpmMax = p.has("bpmMax") ? Number(p.get("bpmMax")) : Infinity;
  const allOf = p.get("filterBehaviour") === "allOf";

  const matchIds = (have: { id: string; parent?: { id: string } }[], want: string[]) => {
    if (!want.length) return true;
    const ids = new Set(have.flatMap((x) => [x.id, x.parent?.id].filter(Boolean) as string[]));
    return allOf ? want.every((w) => ids.has(w)) : want.some((w) => ids.has(w));
  };

  return TRACKS.map((t) => {
    const haystack = [t.title, ...t.mainArtists, ...t.tags, ...t.moods.map((m) => m.name), ...t.genres.map((g) => g.name)]
      .join(" ")
      .toLowerCase();
    const score = terms.filter((w) => haystack.includes(w)).length;
    return { t, score };
  })
    .filter(({ t, score }) =>
      (terms.length === 0 || score > 0) &&
      matchIds(t.moods, moods) &&
      matchIds(t.genres, genres) &&
      (vocalTypes.length === 0 || vocalTypes.includes(t.vocalType)) &&
      t.bpm >= bpmMin &&
      t.bpm <= bpmMax,
    )
    .sort((a, b) => b.score - a.score || a.t.id.localeCompare(b.t.id))
    .map(({ t }) => t);
}

function similar(track: CatalogTrack): CatalogTrack[] {
  const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
  const moods = ids(track.moods);
  const genres = ids(track.genres);
  return TRACKS.filter((t) => t.id !== track.id)
    .map((t) => ({
      t,
      score:
        2 * t.moods.filter((m) => moods.has(m.id)).length +
        2 * t.genres.filter((g) => genres.has(g.id)).length -
        Math.abs(t.bpm - track.bpm) / 20,
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ t }) => t);
}

function highlights(track: CatalogTrack, durations: number[]) {
  const peak = Math.round(track.length * 0.4);
  const want = durations.length ? durations : [30];
  return {
    highlights: want.map((d) => {
      const duration = Math.min(d, track.length);
      const from = Math.max(0, Math.min(peak - Math.round(duration / 2), track.length - duration));
      return { from, to: from + duration, duration };
    }),
  };
}

function sign(trackId: string, exp: number): string {
  return createHmac("sha256", SIGNING_SECRET).update(`${trackId}:${exp}`).digest("hex").slice(0, 32);
}

/** 6 seconds of 8 kHz mono 8-bit PCM: a click track at the song's BPM. */
function previewWav(track: CatalogTrack): Buffer {
  const rate = 8000;
  const samples = rate * 6;
  const data = Buffer.alloc(samples);
  const beat = Math.round((60 / track.bpm) * rate);
  const pitch = 220 + (track.bpm % 12) * 30;
  for (let i = 0; i < samples; i++) {
    const inBeat = i % beat;
    const env = inBeat < rate * 0.08 ? 1 - inBeat / (rate * 0.08) : 0;
    const pad = 0.15 * Math.sin((2 * Math.PI * (pitch / 2) * i) / rate);
    const click = env * 0.6 * Math.sin((2 * Math.PI * pitch * i) / rate);
    data[i] = Math.round(128 + 127 * Math.max(-1, Math.min(1, pad + click)));
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + samples, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write("data", 36);
  header.writeUInt32LE(samples, 40);
  return Buffer.concat([header, data]);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return null;
  }
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", origin(req));
  const path = url.pathname;

  // Signed media URLs are served without the API key, like the real CDN.
  const media = path.match(/^\/media\/([A-Za-z0-9]+)\.wav$/);
  if (media && req.method === "GET") {
    const exp = Number(url.searchParams.get("exp"));
    const track = TRACKS.find((t) => t.id === media[1]);
    if (!track || !exp || url.searchParams.get("sig") !== sign(track.id, exp)) {
      return send(res, 403, { message: "Invalid signature" });
    }
    if (Date.now() > exp) return send(res, 403, { message: "URL expired" });
    const wav = previewWav(track);
    res.writeHead(200, { "content-type": "audio/wav", "content-length": String(wav.byteLength) });
    return res.end(wav);
  }

  if (path === "/health") return send(res, 200, { status: "ok" });

  if (req.headers.authorization !== `Bearer ${API_KEY}`) {
    return send(res, 401, { message: "Unauthorized" });
  }

  const now = Date.now();
  const recent = (requestLog.get(API_KEY) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= RATE_LIMIT_PER_MIN) {
    const retryAfter = Math.ceil((recent[0] + 60_000 - now) / 1000);
    return send(res, 429, { message: "Rate limit exceeded" }, { "retry-after": String(retryAfter) });
  }
  recent.push(now);
  requestLog.set(API_KEY, recent);

  await new Promise((r) => setTimeout(r, 50 + Math.random() * 200));
  if (Math.random() < FAILURE_RATE) {
    return send(res, 503, { message: "Service temporarily unavailable" });
  }

  const base = origin(req);
  let m: RegExpMatchArray | null;

  if (req.method === "GET" && path === "/v0/moods") {
    return send(res, 200, { moods: MOODS, pagination: { page: 1, limit: 60, offset: 0 }, links: {} });
  }
  if (req.method === "GET" && path === "/v0/genres") {
    return send(res, 200, { genres: GENRES, pagination: { page: 1, limit: 60, offset: 0 }, links: {} });
  }
  if (req.method === "GET" && path === "/v0/tracks/search") {
    return send(res, 200, paginate(req, url, search(url)));
  }
  if (req.method === "GET" && (m = path.match(/^\/v0\/tracks\/([^/]+)\/(similar|highlights|stream)$/))) {
    const track = TRACKS.find((t) => t.id === m![1]);
    if (!track) return send(res, 404, { message: "Track not found" });
    if (m[2] === "similar") return send(res, 200, paginate(req, url, similar(track)));
    if (m[2] === "highlights") {
      return send(res, 200, highlights(track, url.searchParams.getAll("duration").map(Number).filter(Boolean)));
    }
    const exp = now + 10 * 60_000;
    return send(res, 200, {
      url: `${base}/media/${track.id}.wav?exp=${exp}&sig=${sign(track.id, exp)}`,
      expires: new Date(exp).toISOString(),
    });
  }
  if (req.method === "POST" && path === "/v0/usage") {
    const body = (await readJson(req)) as Partial<UsageReport> | null;
    const unknown = (body?.trackIds ?? []).filter((id) => !TRACKS.some((t) => t.id === id));
    if (!body || body.eventType !== "EXPORTED" || !body.platform || !body.trackIds?.length || unknown.length) {
      return send(res, 400, {
        message: "Invalid usage report",
        errors: unknown.length ? [{ key: "trackIds", messages: [`Unknown track ids: ${unknown.join(", ")}`] }] : [],
      });
    }
    usageReports.push({
      receivedAt: new Date().toISOString(),
      eventType: body.eventType,
      platform: body.platform,
      trackIds: body.trackIds,
    });
    console.log(`[mock-es-api] usage report #${usageReports.length}: ${body.platform} ${body.trackIds.join(",")}`);
    return send(res, 200, { message: "Usage reported" });
  }
  // Not part of the real API: lets you see what the app has reported.
  if (req.method === "GET" && path === "/_mock/usage") {
    return send(res, 200, { count: usageReports.length, reports: usageReports });
  }

  return send(res, 404, { message: `No mock for ${req.method} ${path}` });
}

createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error("[mock-es-api]", err);
    send(res, 500, { message: "Mock server error" });
  });
}).listen(PORT, () => {
  console.log(`[mock-es-api] listening on http://localhost:${PORT} (${TRACKS.length} tracks)`);
});
