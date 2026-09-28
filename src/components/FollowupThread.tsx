"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "./icons";
import { ShortlistDocument } from "./ShortlistDocument";

export type Followup = {
  id: string;
  question: string;
  answer: string;
};

export function FollowupThread({
  shortlistId,
  followups,
}: {
  shortlistId: string;
  followups: Followup[];
}) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pending, setPending] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || streaming) return;

    setStreaming(true);
    setPending("");
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/shortlist/${shortlistId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error ?? `HTTP ${res.status}`);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let sepIdx: number;
        while ((sepIdx = buf.indexOf("\n\n")) >= 0) {
          const ev = buf.slice(0, sepIdx).trim();
          buf = buf.slice(sepIdx + 2);
          if (ev.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(ev.slice(6));
              if (parsed.type === "text-delta" && parsed.delta) {
                assembled += parsed.delta;
                setPending(assembled);
              }
            } catch {
              // ignore
            }
          }
        }
      }

      router.refresh();
      setQuestion("");
      setPending("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setStreaming(false);
    }
  }

  const canSubmit = !!question.trim() && !streaming;

  return (
    <div className="sa-thread">
      <div className="sa-thread__title">
        Follow-<em>ups</em>
      </div>
      <div className="sa-thread__list" style={{ overflowY: "auto" }}>
        {followups.length === 0 && !pending && (
          <p
            style={{
              color: "var(--fg-muted)",
              fontSize: 13,
              fontStyle: "italic",
              margin: 0,
            }}
          >
            Ask about the shortlist below, e.g. &ldquo;anything slower?&rdquo;
          </p>
        )}
        {followups.map((f) => (
          <div key={f.id} className="sa-qa">
            <div className="sa-qa__q">{f.question}</div>
            <div className="sa-qa__a">
              <ShortlistDocument text={f.answer} />
            </div>
          </div>
        ))}
        {pending && (
          <div className="sa-qa">
            <div className="sa-qa__q">{question.trim()}</div>
            <div className="sa-qa__a">
              <ShortlistDocument text={pending} trailingCursor />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="sa-thread__composer">
        <textarea
          className="sa-thread__textarea"
          placeholder="Ask about these tracks…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
              handleSubmit(e);
            }
          }}
          rows={2}
          disabled={streaming}
        />
        <button
          type="submit"
          className="sa-btn sa-btn--primary"
          style={{ padding: "10px 14px" }}
          disabled={!canSubmit}
        >
          {streaming ? "…" : "Ask"}
          {!streaming && <Send size={12} />}
        </button>
      </form>

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "-0.005em",
        }}
      >
        Answers reuse the catalogue lookups from this shortlist. ⌘+Enter to send.
        {errorMsg && (
          <div style={{ color: "var(--sa-error)", marginTop: 4 }}>
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
