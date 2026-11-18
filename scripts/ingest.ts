import { createDomainCore } from "../src/domain";
import { createDb } from "../src/domain/db/client";
import { adapters } from "../src/domain/sources";

// Usage: pnpm ingest <source-id>, for example `pnpm ingest hacker-news`.
const sourceId = process.argv[2];
const known = adapters.map((adapter) => adapter.id);
if (!sourceId || !known.includes(sourceId)) {
  console.error(`Usage: pnpm ingest <source-id>\nKnown Sources: ${known.join(", ")}`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set; copy .env.example to .env");

const db = createDb(url);
try {
  const core = createDomainCore({ db, http: fetch, secrets: { githubToken: process.env.GITHUB_TOKEN || undefined } });
  await core.ingest(sourceId, new Date());
  for (const timeWindow of ["day", "week"] as const) {
    const ranking = await core.getSourceRanking({ sourceId, timeWindow });
    if (ranking.items.length > 0) console.log(`Ingested ${sourceId}: ${ranking.items.length} Items for the ${timeWindow}.`);
  }
} finally {
  await db.$client.end();
}

// Tell the web app its cached data for this Source is stale. Skipped when no web app is configured.
const webUrl = process.env.REVALIDATE_URL;
const revalidateSecret = process.env.REVALIDATE_SECRET;
if (webUrl && revalidateSecret) {
  const response = await fetch(new URL("/api/revalidate", webUrl), {
    method: "POST",
    headers: { authorization: `Bearer ${revalidateSecret}`, "content-type": "application/json" },
    body: JSON.stringify({ sourceIds: [sourceId] }),
  }).catch((error: unknown) => error as Error);
  if (response instanceof Error || !response.ok) {
    const reason = response instanceof Error ? response.message : `answered ${response.status}`;
    console.error(`Ingested, but revalidating ${webUrl} failed: ${reason}`);
    process.exitCode = 1;
  } else {
    console.log(`Revalidated ${sourceId} on ${webUrl}.`);
  }
} else {
  console.log("REVALIDATE_URL or REVALIDATE_SECRET is not set; cached pages stay as they are.");
}
