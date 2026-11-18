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
