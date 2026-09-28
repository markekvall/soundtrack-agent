/** Scheme the prompt tells the model to use for track links: `[Title](track:ID)`. */
export const TRACK_SCHEME = "track:";

/** Track ids the model linked as `[Title](track:ID)`, in order, deduped. */
export function extractTrackLinks(text: string): { id: string; title: string }[] {
  const seen = new Set<string>();
  const out: { id: string; title: string }[] = [];
  for (const m of text.matchAll(/\[([^\]]+)\]\(track:([A-Za-z0-9_-]+)\)/g)) {
    const [, title, id] = m;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title });
  }
  return out;
}
