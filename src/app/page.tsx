"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@/components/icons";
import { ActivityFeed, AppNav, HeaderStrip } from "@/components/AppChrome";
import { ShortlistDocument } from "@/components/ShortlistDocument";
import { toolCallsToActivity, useShortlist } from "@/hooks/useShortlist";
import { SHOWCASE_BRIEFS } from "@/lib/showcase";

export default function HomePage() {
  const router = useRouter();
  const { status, text, toolCalls, shortlistId, errorMsg, submit } =
    useShortlist();

  const [brief, setBrief] = useState("");
  const [length, setLength] = useState("");

  useEffect(() => {
    if (status === "done" && shortlistId) {
      router.push(`/shortlist/${shortlistId}`);
    }
  }, [status, shortlistId, router]);

  if (status === "idle" || status === "error") {
    return (
      <IdleLayout
        brief={brief}
        length={length}
        setBrief={setBrief}
        setLength={setLength}
        onSubmit={() => {
          const seconds = Number.parseInt(length, 10);
          submit(brief.trim(), Number.isFinite(seconds) ? seconds : undefined);
        }}
        errorMsg={errorMsg}
      />
    );
  }

  return <StreamingLayout brief={brief} text={text} toolCalls={toolCalls} />;
}

function IdleLayout({
  brief,
  length,
  setBrief,
  setLength,
  onSubmit,
  errorMsg,
}: {
  brief: string;
  length: string;
  setBrief: (v: string) => void;
  setLength: (v: string) => void;
  onSubmit: () => void;
  errorMsg: string | null;
}) {
  const canSubmit = brief.trim().length >= 10;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  }

  return (
    <div className="sa-app">
      <AppNav />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "64px 40px 0",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--fg-muted)",
            marginBottom: 28,
          }}
        >
          Music for your video
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: 76,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            color: "var(--es-black)",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          From brief,
          <br />
          to <em style={{ fontWeight: 500 }}>shortlist</em>.
        </h1>
        <p
          style={{
            margin: "24px 0 0",
            maxWidth: 580,
            textAlign: "center",
            fontSize: 16,
            color: "var(--fg-muted)",
            lineHeight: 1.5,
            letterSpacing: "-0.012em",
          }}
        >
          Describe the video you&apos;re cutting. Soundtrack Agent searches the
          Epidemic Sound catalogue and comes back with a shortlist, the reason
          each track fits, and where to cut it.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ width: 720, maxWidth: "100%", marginTop: 56, paddingBottom: 64 }}
        >
          <div className="sa-form">
            <div className="sa-field">
              <label className="sa-field__label" htmlFor="brief">
                Video brief
              </label>
              <textarea
                id="brief"
                className="sa-field__input sa-field__input--text"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. 30-second product teaser, upbeat, voiceover so no lead vocals"
                rows={3}
                autoFocus
                style={{ resize: "vertical" }}
              />
            </div>
            <div className="sa-field">
              <label className="sa-field__label" htmlFor="length">
                Video length in seconds (optional)
              </label>
              <input
                id="length"
                className="sa-field__input sa-field__input--text"
                value={length}
                onChange={(e) => setLength(e.target.value.replace(/\D/g, ""))}
                placeholder="30"
                inputMode="numeric"
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 8,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {SHOWCASE_BRIEFS.map((s) => (
                  <button
                    key={s.caption}
                    type="button"
                    className="sa-pill"
                    onClick={() => {
                      setBrief(s.brief);
                      setLength(s.videoLengthSec ? String(s.videoLengthSec) : "");
                    }}
                  >
                    Try <span style={{ color: "var(--fg-muted)" }}>{s.caption}</span>
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="sa-btn sa-btn--primary sa-btn--lg"
                disabled={!canSubmit}
              >
                Find tracks
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                marginTop: 18,
                padding: 12,
                background: "rgba(176, 58, 46, 0.08)",
                border: "1px solid rgba(176, 58, 46, 0.3)",
                borderRadius: 4,
                color: "#b03a2e",
                fontSize: 13,
              }}
            >
              {errorMsg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function StreamingLayout({
  brief,
  text,
  toolCalls,
}: {
  brief: string;
  text: string;
  toolCalls: ReturnType<typeof useShortlist>["toolCalls"];
}) {
  const activity = toolCallsToActivity(toolCalls);
  const currentRunning = activity.find((a) => a.state === "running");
  const meta = currentRunning
    ? currentRunning.detail
      ? `${currentRunning.label} · ${currentRunning.detail}`
      : currentRunning.label
    : "Building shortlist";

  return (
    <div className="sa-app">
      <HeaderStrip brief={brief} meta={meta} />
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          minHeight: 0,
        }}
      >
        <div
          style={{
            padding: "40px 56px 40px 64px",
            overflowY: "auto",
            borderRight: "1px solid var(--border-soft)",
          }}
        >
          {text ? (
            <ShortlistDocument text={text} trailingCursor />
          ) : (
            <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>
              Listening through the catalogue
              <span className="sa-cursor" />
            </p>
          )}
        </div>
        <div
          style={{
            padding: "40px 32px 40px 32px",
            background: "var(--es-off-white)",
            overflowY: "auto",
          }}
        >
          <ActivityFeed entries={activity} />
        </div>
      </div>
    </div>
  );
}
