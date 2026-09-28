"use client";

import { useRef, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { TRACK_SCHEME } from "@/lib/track-links";
import { Pause, Play } from "./icons";

// react-markdown strips unknown URL schemes by default; keep `track:` links
// so we can render them as preview players.
function urlTransform(url: string): string {
  return url.startsWith(TRACK_SCHEME) ? url : defaultUrlTransform(url);
}

function TrackLink({
  trackId,
  children,
}: {
  trackId: string;
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    if (!audioRef.current) {
      audioRef.current = new Audio(
        `/api/preview?trackId=${encodeURIComponent(trackId)}`,
      );
      audioRef.current.addEventListener("ended", () => setPlaying(false));
      audioRef.current.addEventListener("pause", () => setPlaying(false));
      audioRef.current.addEventListener("play", () => setPlaying(true));
    }
    if (playing) audioRef.current.pause();
    else void audioRef.current.play().catch(() => setPlaying(false));
  }

  return (
    <span className="sa-track">
      <button
        type="button"
        className="sa-track__play"
        aria-label={playing ? "Pause preview" : "Play preview"}
        onClick={toggle}
      >
        {playing ? <Pause size={10} /> : <Play size={10} />}
      </button>
      <span className="sa-track__title">{children}</span>
    </span>
  );
}

export function ShortlistDocument({
  text,
  trailingCursor,
}: {
  text: string;
  trailingCursor?: boolean;
}) {
  return (
    <div className="sa-doc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={urlTransform}
        components={{
          table: ({ children }) => (
            <table className="sa-table">{children}</table>
          ),
          code: ({ children }) => (
            <code className="sa-mono">{children}</code>
          ),
          a: ({ href, children, ...rest }) => {
            if (href?.startsWith(TRACK_SCHEME)) {
              return (
                <TrackLink trackId={href.slice(TRACK_SCHEME.length)}>
                  {children}
                </TrackLink>
              );
            }
            return (
              <a
                href={href}
                target={href ? "_blank" : undefined}
                rel={href ? "noopener noreferrer" : undefined}
                {...rest}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
      {trailingCursor && <span className="sa-cursor" />}
    </div>
  );
}
