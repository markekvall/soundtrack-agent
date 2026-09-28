"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PLATFORMS = [
  "YOUTUBE",
  "INSTAGRAM",
  "TIKTOK",
  "FACEBOOK",
  "TWITTER",
  "TWITCH",
  "LOCAL",
  "OTHER",
] as const;

export type Selection = { trackId: string; platform: string };

export function TrackPicker({
  shortlistId,
  tracks,
  selections,
}: {
  shortlistId: string;
  tracks: { id: string; title: string }[];
  selections: Selection[];
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("YOUTUBE");
  const [busy, setBusy] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function select(trackId: string) {
    setBusy(trackId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/shortlist/${shortlistId}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, platform }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  if (tracks.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div className="sa-thread__title" style={{ margin: 0 }}>
          Use a <em>track</em>
        </div>
        <label style={{ fontSize: 12, color: "var(--fg-muted)" }}>
          Publishing to{" "}
          <select
            className="sa-select"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="sa-picks">
        {tracks.map((t) => {
          const used = selections.filter((s) => s.trackId === t.id);
          return (
            <div key={t.id} className="sa-picks__row">
              <span className="sa-picks__title">{t.title}</span>
              {used.length > 0 && (
                <span className="sa-picks__done">
                  used · {used.map((u) => u.platform.toLowerCase()).join(", ")}
                </span>
              )}
              <button
                type="button"
                className="sa-btn sa-btn--secondary"
                disabled={busy !== null}
                onClick={() => select(t.id)}
              >
                {busy === t.id ? "…" : "Use"}
              </button>
            </div>
          );
        })}
      </div>
      {errorMsg && (
        <div style={{ color: "var(--sa-error)", fontSize: 12, marginTop: 6 }}>{errorMsg}</div>
      )}
    </div>
  );
}
