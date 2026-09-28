import Link from "next/link";
import { Alert, Check, Dot, Refresh } from "./icons";

export function AppMark({ subtle }: { subtle?: boolean }) {
  return (
    <div className="sa-mark" style={subtle ? { fontSize: 15 } : undefined}>
      <span className="sa-mark__bug">s</span>
      <span>Soundtrack Agent</span>
    </div>
  );
}

export function AppNav() {
  return (
    <div className="sa-nav">
      <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
        <AppMark />
      </Link>
      <div className="sa-nav__right">
        <Link href="/shortlists">Recent shortlists</Link>
      </div>
    </div>
  );
}

export function HeaderStrip({
  brief,
  meta,
}: {
  brief: string;
  meta?: string | null;
}) {
  return (
    <div className="sa-headerstrip">
      <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
        <AppMark subtle />
      </Link>
      <span className="sa-headerstrip__sep" />
      <span className="sa-headerstrip__ctx">{brief}</span>
      <span className="sa-headerstrip__meta">
        {meta && <span>{meta}</span>}
        <Link
          href="/"
          style={{
            color: "var(--es-black)",
            textDecorationColor: "rgba(0,0,0,0.3)",
          }}
        >
          New brief
        </Link>
      </span>
    </div>
  );
}

export type ActivityState = "pending" | "running" | "done" | "error";
export type ActivityEntry = {
  state: ActivityState;
  label: string;
  detail?: string;
};

export function ActivityFeed({
  entries,
  quiet,
}: {
  entries: ActivityEntry[];
  quiet?: boolean;
}) {
  return (
    <div className={"sa-activity" + (quiet ? " sa-activity--quiet" : "")}>
      <div className="sa-activity__title">Activity</div>
      {entries.map((e, i) => {
        const Icon =
          e.state === "pending"
            ? Dot
            : e.state === "running"
              ? Refresh
              : e.state === "error"
                ? Alert
                : Check;
        return (
          <div
            key={i}
            className={"sa-activity__entry sa-activity__entry--" + e.state}
          >
            <span className="sa-activity__icon">
              <Icon />
            </span>
            <div className="sa-activity__body">
              <div className="sa-activity__label">{e.label}</div>
              {e.detail && (
                <div className="sa-activity__detail">{e.detail}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
