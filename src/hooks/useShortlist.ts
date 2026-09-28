"use client";

import { useState } from "react";

export type ToolCall = {
  toolCallId: string;
  toolName: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
};

export type ShortlistStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "done"
  | "error";

export function useShortlist() {
  const [status, setStatus] = useState<ShortlistStatus>("idle");
  const [text, setText] = useState("");
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [shortlistId, setShortlistId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function reset() {
    setStatus("idle");
    setText("");
    setToolCalls([]);
    setShortlistId(null);
    setErrorMsg(null);
  }

  async function submit(brief: string, videoLengthSec?: number) {
    setStatus("loading");
    setText("");
    setToolCalls([]);
    setShortlistId(null);
    setErrorMsg(null);

    let res: Response;
    try {
      res = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, videoLengthSec }),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
      return;
    }

    if (!res.ok || !res.body) {
      const errBody = await res.json().catch(() => ({}));
      setErrorMsg(errBody?.error ?? `HTTP ${res.status}`);
      setStatus("error");
      return;
    }

    setStatus("streaming");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIdx: number;
      while ((sepIdx = buffer.indexOf("\n\n")) >= 0) {
        const event = buffer.slice(0, sepIdx).trim();
        buffer = buffer.slice(sepIdx + 2);
        if (!event.startsWith("data: ")) continue;
        try {
          const parsed = JSON.parse(event.slice(6));
          handleChunk(parsed);
        } catch {
          // ignore malformed lines
        }
      }
    }

    setStatus("done");

    function handleChunk(chunk: { type?: string } & Record<string, unknown>) {
      switch (chunk.type) {
        case "data-shortlist-id": {
          const data = chunk.data as { id?: string } | undefined;
          if (data?.id) setShortlistId(data.id);
          break;
        }
        case "text-delta": {
          const delta = chunk.delta as string | undefined;
          if (delta) setText((prev) => prev + delta);
          break;
        }
        case "tool-input-available": {
          const tc: ToolCall = {
            toolCallId: chunk.toolCallId as string,
            toolName: chunk.toolName as string,
            input: chunk.input as Record<string, unknown> | undefined,
          };
          setToolCalls((prev) => [...prev, tc]);
          break;
        }
        case "tool-output-available": {
          const id = chunk.toolCallId as string;
          const out = chunk.output as Record<string, unknown> | undefined;
          setToolCalls((prev) =>
            prev.map((c) => (c.toolCallId === id ? { ...c, output: out } : c)),
          );
          break;
        }
      }
    }
  }

  return { status, text, toolCalls, shortlistId, errorMsg, submit, reset };
}

// Translate raw tool calls to user-friendly activity-feed entries.
export function toolCallsToActivity(toolCalls: ToolCall[]) {
  const labelFor: Record<string, string> = {
    listMoods: "Mood taxonomy",
    listGenres: "Genre taxonomy",
    searchTracks: "Searching catalogue",
    getNextPage: "Next page of results",
    getSimilarTracks: "Similar tracks",
    getHighlights: "Finding the best cut",
  };

  return toolCalls.map((c, i) => {
    const isLast = i === toolCalls.length - 1;
    const finished = c.output !== undefined;
    const state: "running" | "done" | "error" =
      finished && c.output?.error ? "error" : !finished && isLast ? "running" : finished ? "done" : "running";
    const label = labelFor[c.toolName] ?? c.toolName;
    return { state, label, detail: detailFor(c) };
  });
}

function detailFor(c: ToolCall): string | undefined {
  const input = c.input ?? {};
  if (c.toolName === "searchTracks") {
    const parts = [
      input.term ? `"${String(input.term)}"` : null,
      Array.isArray(input.mood) && input.mood.length ? `mood ${input.mood.join(", ")}` : null,
      Array.isArray(input.genre) && input.genre.length ? `genre ${input.genre.join(", ")}` : null,
      input.bpmMin || input.bpmMax ? `${input.bpmMin ?? "…"}–${input.bpmMax ?? "…"} bpm` : null,
    ].filter(Boolean);
    const count = c.output?.count as number | undefined;
    return [parts.join(" · "), count != null ? `${count} tracks` : null]
      .filter(Boolean)
      .join(" → ");
  }
  if (c.toolName === "getSimilarTracks" || c.toolName === "getHighlights") {
    return input.trackId ? String(input.trackId) : undefined;
  }
  if (c.output?.error) return String(c.output.message ?? "error");
  return undefined;
}
