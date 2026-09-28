"use client";

import { useState } from "react";
import { X } from "./icons";

export type ToolCallTrace = {
  toolCallId: string;
  toolName: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
};

export type ConsideredTrack = {
  id: string;
  title: string;
  artists: string;
  bpm: number;
  lengthSec: number;
  moods: string[];
  vocalType: string;
  shortlisted: boolean;
};

type Tab = "tracks" | "reasoning" | "tools";

export function SourcePanel({
  open,
  onClose,
  tracks,
  toolCalls,
  reasoning,
}: {
  open: boolean;
  onClose: () => void;
  tracks: ConsideredTrack[];
  toolCalls: ToolCallTrace[];
  reasoning: string | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("tracks");
  if (!open) return null;

  return (
    <>
      <div className="sa-backdrop" style={{ position: "fixed" }} onClick={onClose} />
      <div className="sa-sourcepanel" style={{ position: "fixed" }}>
        <div className="sa-sourcepanel__head">
          <h3 className="sa-sourcepanel__heading">
            How the agent <em>got here</em>
          </h3>
          <button
            type="button"
            className="sa-btn sa-btn--ghost sa-btn--icon"
            aria-label="Close"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="sa-tabs">
          <TabButton active={activeTab === "tracks"} onClick={() => setActiveTab("tracks")} count={tracks.length}>
            Tracks considered
          </TabButton>
          <TabButton active={activeTab === "reasoning"} onClick={() => setActiveTab("reasoning")}>
            Reasoning
          </TabButton>
          <TabButton active={activeTab === "tools"} onClick={() => setActiveTab("tools")} count={toolCalls.length}>
            Tool calls
          </TabButton>
        </div>
        <div className="sa-sourcepanel__body" style={{ overflowY: "auto" }}>
          {activeTab === "tracks" && <TracksTab tracks={tracks} />}
          {activeTab === "reasoning" && <ReasoningTab reasoning={reasoning} />}
          {activeTab === "tools" && <ToolCallsTab toolCalls={toolCalls} />}
        </div>
      </div>
    </>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={"sa-tab" + (active ? " sa-tab--active" : "")}
      onClick={onClick}
    >
      {children}
      {count != null && (
        <span style={{ color: "var(--fg-muted)", marginLeft: 4 }}>{count}</span>
      )}
    </button>
  );
}

function formatLength(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function TracksTab({ tracks }: { tracks: ConsideredTrack[] }) {
  if (tracks.length === 0) {
    return (
      <p style={{ color: "var(--fg-muted)", fontSize: 13 }}>
        No catalogue results recorded for this shortlist.
      </p>
    );
  }
  return (
    <table className="sa-table">
      <thead>
        <tr>
          <th>Track</th>
          <th style={{ width: 56 }}>BPM</th>
          <th style={{ width: 56 }}>Length</th>
          <th>Moods</th>
        </tr>
      </thead>
      <tbody>
        {tracks.map((t) => (
          <tr key={t.id}>
            <td>
              <div style={{ fontWeight: t.shortlisted ? 600 : 400 }}>
                {t.title}
                {t.shortlisted && (
                  <span style={{ color: "var(--sa-accent)", marginLeft: 6, fontSize: 11 }}>
                    shortlisted
                  </span>
                )}
              </div>
              <div style={{ color: "var(--fg-muted)", fontSize: 12 }}>
                {t.artists} · <span className="sa-mono">{t.id}</span>
              </div>
            </td>
            <td><span className="sa-mono">{t.bpm}</span></td>
            <td><span className="sa-mono">{formatLength(t.lengthSec)}</span></td>
            <td style={{ fontSize: 12 }}>
              {t.moods.join(", ")}
              {t.vocalType !== "NONE" && (
                <div style={{ color: "var(--fg-muted)" }}>vocals: {t.vocalType.toLowerCase()}</div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReasoningTab({ reasoning }: { reasoning: string | null }) {
  if (!reasoning || !reasoning.trim()) {
    return (
      <p style={{ color: "var(--fg-muted)", fontSize: 13 }}>
        The agent went straight to the shortlist without commentary.
      </p>
    );
  }
  return (
    <div>
      <p
        style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--fg-muted)",
          margin: "0 0 14px 0",
          fontWeight: 500,
        }}
      >
        Agent commentary between steps
      </p>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          letterSpacing: "-0.005em",
          color: "var(--es-off-black)",
          fontStyle: "italic",
          whiteSpace: "pre-wrap",
        }}
      >
        {reasoning.trim()}
      </div>
    </div>
  );
}

function ToolCallsTab({ toolCalls }: { toolCalls: ToolCallTrace[] }) {
  if (toolCalls.length === 0) {
    return (
      <p style={{ color: "var(--fg-muted)", fontSize: 13 }}>
        No tool-call trace recorded for this shortlist.
      </p>
    );
  }
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        lineHeight: 1.7,
        color: "var(--es-off-black)",
      }}
    >
      {toolCalls.map((c, i) => (
        <div
          key={c.toolCallId || i}
          style={{ padding: "12px 0", borderBottom: "1px solid var(--border-soft)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>
              <span style={{ color: "var(--fg-muted)" }}>{i + 1}.</span>
              &nbsp;
              <span style={{ color: "var(--sa-accent)" }}>{c.toolName}</span>
            </span>
            <span style={{ color: "var(--fg-muted)" }}>{c.output ? "✓ done" : "—"}</span>
          </div>
          <div style={{ color: "var(--fg-muted)", marginBottom: 4, wordBreak: "break-all" }}>
            {JSON.stringify(c.input ?? {})}
          </div>
          <div style={{ wordBreak: "break-word" }}>→ {summarizeOutput(c.output)}</div>
        </div>
      ))}
    </div>
  );
}

function summarizeOutput(output: Record<string, unknown> | undefined): string {
  if (!output) return "(no output)";
  if (output.error) return `error: ${String(output.message ?? "unknown")}`;
  if (Array.isArray(output.tracks)) {
    return `${output.tracks.length} tracks${output.nextPageUrl ? " · more available" : ""}`;
  }
  if (Array.isArray(output.moods)) return `${output.moods.length} moods`;
  if (Array.isArray(output.genres)) return `${output.genres.length} genres`;
  if (Array.isArray(output.highlights)) {
    return (output.highlights as Array<{ from: number; to: number }>)
      .map((h) => `${formatLength(h.from)}–${formatLength(h.to)}`)
      .join(", ");
  }
  return "ok";
}
