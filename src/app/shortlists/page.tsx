import { desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { AppNav } from "@/components/AppChrome";
import { db } from "@/lib/db/client";
import { shortlists } from "@/lib/db/schema";
import { estimateCostUsd } from "@/lib/usage-cost";

export const dynamic = "force-dynamic";

function summary(text: string, max = 220) {
  const shortlistIdx = text.indexOf("## Shortlist");
  const after = shortlistIdx >= 0 ? text.slice(0, shortlistIdx) : text;
  const cleaned = after
    .replace("## Brief", "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/[#*`>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > max ? cleaned.slice(0, max).trimEnd() + "…" : cleaned;
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  return date.toISOString().slice(0, 10);
}

export default async function ShortlistsIndexPage() {
  const rows = await db
    .select()
    .from(shortlists)
    .orderBy(desc(shortlists.createdAt))
    .limit(50);

  return (
    <div className="sa-app">
      <AppNav />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "56px 40px 80px",
        }}
      >
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
              marginBottom: 16,
            }}
          >
            Recent shortlists
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: 40,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "var(--es-black)",
            }}
          >
            Every brief the agent has scored.
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 14,
              color: "var(--fg-muted)",
              lineHeight: 1.5,
              letterSpacing: "-0.012em",
              maxWidth: 560,
            }}
          >
            Persisted across sessions. Click any row to open the shortlist, the
            tracks the agent considered, and the follow-up thread.
          </p>

          <div style={{ marginTop: 40 }}>
            {rows.length === 0 ? (
              <EmptyState />
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {rows.map((d) => {
                  const cost = estimateCostUsd(d.usage);
                  return (
                    <li
                      key={d.id}
                      style={{
                        borderTop: "1px solid var(--border-soft)",
                      }}
                    >
                      <Link
                        href={`/shortlist/${d.id}`}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          display: "block",
                          padding: "20px 0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "space-between",
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 14,
                              fontWeight: 500,
                              color: "var(--es-black)",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {d.videoLengthSec ? `${d.videoLengthSec}s video` : "Video brief"}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              color: "var(--fg-muted)",
                              letterSpacing: "-0.005em",
                            }}
                          >
                            {timeAgo(d.createdAt)}
                            {cost != null ? ` · $${cost.toFixed(3)}` : ""}
                          </span>
                        </div>
                        <p
                          style={{
                            color: "var(--es-off-black)",
                            fontSize: 13,
                            fontStyle: "italic",
                            margin: "0 0 6px 0",
                            letterSpacing: "-0.005em",
                          }}
                        >
                          “{d.brief}”
                        </p>
                        <p
                          style={{
                            color: "var(--fg-muted)",
                            fontSize: 13,
                            margin: 0,
                            lineHeight: 1.55,
                            letterSpacing: "-0.005em",
                          }}
                        >
                          {summary(d.text)}
                        </p>
                      </Link>
                    </li>
                  );
                })}
                <li
                  style={{
                    borderTop: "1px solid var(--border-soft)",
                    padding: "20px 0",
                  }}
                />
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "32px 28px",
        background: "var(--es-white)",
        border: "1px solid var(--border-soft)",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: 20,
          color: "var(--es-black)",
          letterSpacing: "-0.02em",
        }}
      >
        No shortlists yet.
      </div>
      <p
        style={{
          color: "var(--fg-muted)",
          fontSize: 14,
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        Describe a video on the home page. Each shortlist is saved here
        automatically.
      </p>
      <Link
        href="/"
        className="sa-btn sa-btn--primary"
        style={{ marginTop: 4 }}
      >
        Write a brief
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
