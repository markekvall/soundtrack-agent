import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { shortlists } from "../src/lib/db/schema";
import { SHOWCASE_BRIEFS } from "../src/lib/showcase";

const ENDPOINT =
  process.env.SOUNDTRACK_AGENT_URL ?? "http://localhost:3000/api/shortlist";

async function generateShortlist(brief: string, videoLengthSec?: number) {
  console.log(`\n→ ${brief.slice(0, 70)}${brief.length > 70 ? "…" : ""}`);

  const existing = await db
    .select({ id: shortlists.id })
    .from(shortlists)
    .where(eq(shortlists.brief, brief))
    .limit(1);
  if (existing.length > 0) {
    console.log(`  ⊘ already generated (id ${existing[0].id}); skipping`);
    return;
  }

  const start = Date.now();
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief, videoLengthSec }),
    });
  } catch (err) {
    console.error(`  ✗ network error — is \`pnpm dev\` running?`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    console.error(`  ✗ HTTP ${res.status}: ${text.slice(0, 200)}`);
    return;
  }

  // Drain the stream so the route's `onFinish` fires server-side.
  const reader = res.body.getReader();
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) bytes += value.byteLength;
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const [saved] = await db
    .select()
    .from(shortlists)
    .where(eq(shortlists.brief, brief))
    .limit(1);

  if (saved) {
    console.log(
      `  ✓ done in ${elapsed}s (id ${saved.id}, ${bytes.toLocaleString()} stream bytes)`,
    );
  } else {
    console.error(`  ✗ stream finished but no shortlist persisted; check server logs`);
  }
}

async function main() {
  console.log(`Seeding ${SHOWCASE_BRIEFS.length} shortlists via ${ENDPOINT}`);
  console.log(`(server must be running — start with \`pnpm dev\` or \`docker compose up\`)`);

  for (const s of SHOWCASE_BRIEFS) {
    await generateShortlist(s.brief, s.videoLengthSec);
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
