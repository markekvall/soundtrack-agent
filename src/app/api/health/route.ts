import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export const runtime = "nodejs";

/**
 * Health probe for monitoring and orchestration. Returns 200 only when:
 * - the process is up,
 * - Postgres is reachable,
 * - the required env vars are present.
 *
 * Used by Docker Compose's healthcheck and any external uptime monitor.
 */
export async function GET() {
  const checks: Record<string, "ok" | "missing" | string> = {
    process: "ok",
    ES_API_KEY: process.env.ES_API_KEY ? "ok" : "missing",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "ok" : "missing",
    DATABASE_URL: process.env.DATABASE_URL ? "ok" : "missing",
    postgres: "unknown",
  };

  try {
    await db.execute(sql`SELECT 1`);
    checks.postgres = "ok";
  } catch (err) {
    checks.postgres = err instanceof Error ? `error: ${err.message}` : "error";
  }

  const ok = Object.values(checks).every((v) => v === "ok");
  return Response.json(
    {
      status: ok ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
