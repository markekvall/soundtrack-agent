"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, External } from "@/components/icons";
import { HeaderStrip } from "@/components/AppChrome";
import { ShortlistDocument } from "@/components/ShortlistDocument";
import { FollowupThread, type Followup } from "@/components/FollowupThread";
import { TrackPicker, type Selection } from "@/components/TrackPicker";
import {
  SourcePanel,
  type ConsideredTrack,
  type ToolCallTrace,
} from "@/components/SourcePanel";

type Props = {
  shortlist: {
    id: string;
    brief: string;
    text: string;
    reasoning: string | null;
    finishReason: string | null;
    modelId: string;
    durationMs: number | null;
    costUsd: number | null;
  };
  picks: { id: string; title: string }[];
  selections: Selection[];
  toolCalls: ToolCallTrace[];
  considered: ConsideredTrack[];
  followups: Followup[];
};

function formatHeaderMeta(durationMs: number | null, toolCount: number): string {
  if (durationMs == null) return `${toolCount} tools`;
  const seconds = Math.round(durationMs / 1000);
  const dur =
    seconds < 60
      ? `${seconds} s`
      : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${dur} · ${toolCount} tool${toolCount === 1 ? "" : "s"}`;
}

function formatFooterMeta(s: Props["shortlist"]): string {
  const parts: string[] = [];
  if (s.durationMs != null) {
    parts.push(`Generated in ${Math.round(s.durationMs / 1000)} s`);
  }
  if (s.costUsd != null) {
    parts.push(`$${s.costUsd.toFixed(3)} in API costs`);
  }
  parts.push(`model ${s.modelId}`);
  return parts.join(" · ");
}

export function ShortlistPageClient({
  shortlist,
  picks,
  selections,
  toolCalls,
  considered,
  followups,
}: Props) {
  const isIncomplete = !shortlist.text.includes("## Shortlist");
  const router = useRouter();
  const [sourceOpen, setSourceOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shortlist.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="sa-app">
      <HeaderStrip
        brief={shortlist.brief}
        meta={formatHeaderMeta(shortlist.durationMs, toolCalls.length)}
      />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 460px",
          minHeight: 0,
        }}
      >
        <div
          style={{
            padding: "36px 48px 36px 64px",
            overflowY: "auto",
            borderRight: "1px solid var(--border-soft)",
          }}
        >
          {isIncomplete && (
            <aside
              style={{
                marginBottom: 24,
                padding: "14px 16px",
                background: "rgba(176, 58, 46, 0.08)",
                border: "1px solid rgba(176, 58, 46, 0.3)",
                borderRadius: 6,
                fontSize: 13,
                lineHeight: 1.55,
                color: "#7a1a16",
                maxWidth: 720,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Generation incomplete
                {shortlist.finishReason && shortlist.finishReason !== "stop" && (
                  <>
                    {" · "}
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      finish_reason: {shortlist.finishReason}
                    </span>
                  </>
                )}
              </div>
              <div>
                The agent stopped before producing the full shortlist.{" "}
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  style={{
                    background: "none",
                    border: 0,
                    padding: 0,
                    color: "#7a1a16",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: "inherit",
                  }}
                >
                  Try the brief again
                </button>
                .
              </div>
            </aside>
          )}

          <ShortlistDocument text={shortlist.text} />
        </div>

        <div
          style={{
            padding: "36px 32px 24px",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            background: "var(--es-off-white)",
          }}
        >
          <TrackPicker
            shortlistId={shortlist.id}
            tracks={picks}
            selections={selections}
          />
          <FollowupThread shortlistId={shortlist.id} followups={followups} />
        </div>
      </div>

      <div className="sa-footerbar">
        <span className="sa-footerbar__meta">{formatFooterMeta(shortlist)}</span>
        <button type="button" className="sa-btn sa-btn--secondary" onClick={handleCopy}>
          <Copy /> {copied ? "Copied" : "Copy markdown"}
        </button>
        <button
          type="button"
          className="sa-btn sa-btn--secondary"
          onClick={() => setSourceOpen(true)}
        >
          <External /> How the agent got here
        </button>
        <button
          type="button"
          className="sa-btn sa-btn--primary"
          onClick={() => router.push("/")}
        >
          New brief
        </button>
      </div>

      <SourcePanel
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        tracks={considered}
        toolCalls={toolCalls}
        reasoning={shortlist.reasoning}
      />
    </div>
  );
}
