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
  const core = createDomainCore({ db, http: fetch });
  await core.ingest(sourceId, new Date());
  const ranking = await core.getSourceRanking({ sourceId, timeWindow: "day" });
  console.log(`Ingested ${sourceId}: ${ranking.items.length} Items in the daily Source Ranking.`);
} finally {
  await db.$client.end();
}
