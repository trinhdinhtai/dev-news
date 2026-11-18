import { createDomainCore, sourceIds } from "../src/domain";
import { createDb } from "../src/domain/db/client";

// Usage: `pnpm ingest` ingests every Source that is due by its interval (what the scheduled
// workflow runs); `pnpm ingest hacker-news github-trending` ingests the named ones now.
const named = process.argv.slice(2);
const unknown = named.filter((id) => !sourceIds.includes(id));
if (unknown.length > 0) {
  console.error(`Unknown Source: ${unknown.join(", ")}\nUsage: pnpm ingest [source-id...]\nKnown Sources: ${sourceIds.join(", ")}`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set; copy .env.example to .env");

const db = createDb(url);
const results = await (async () => {
  try {
    const core = createDomainCore({ db, http: fetch, secrets: { githubToken: process.env.GITHUB_TOKEN || undefined } });
    return await core.collect(new Date(), named.length > 0 ? { sourceIds: named } : {});
  } finally {
    await db.$client.end();
  }
})();

if (results.length === 0) console.log("No Source is due.");
for (const result of results) {
  if (result.ok) console.log(`Ingested ${result.sourceId}.`);
  else console.error(`Failed ${result.sourceId}: ${result.error}`);
}
// A failed Source fails the run so the workflow shows it, after every other Source was ingested.
if (results.some((result) => !result.ok)) process.exitCode = 1;

// Tell the web app its cached data for these Sources is stale. Skipped when no web app is configured.
const ingested = results.filter((result) => result.ok).map((result) => result.sourceId);
const webUrl = process.env.REVALIDATE_URL;
const revalidateSecret = process.env.REVALIDATE_SECRET;
if (ingested.length === 0) {
  // Nothing new to show.
} else if (webUrl && revalidateSecret) {
  const response = await fetch(new URL("/api/revalidate", webUrl), {
    method: "POST",
    headers: { authorization: `Bearer ${revalidateSecret}`, "content-type": "application/json" },
    body: JSON.stringify({ sourceIds: ingested }),
  }).catch((error: unknown) => error as Error);
  if (response instanceof Error || !response.ok) {
    const reason = response instanceof Error ? response.message : `answered ${response.status}`;
    console.error(`Ingested, but revalidating ${webUrl} failed: ${reason}`);
    process.exitCode = 1;
  } else {
    console.log(`Revalidated ${ingested.join(", ")} on ${webUrl}.`);
  }
} else {
  console.log("REVALIDATE_URL or REVALIDATE_SECRET is not set; cached pages stay as they are.");
}
