import { unstable_cache } from "next/cache";
import { createDomainCore, type DomainCore, sourceIds } from "@/domain";
import { createDb, type Db } from "@/domain/db/client";

// One database client per server process, so dev hot reloads do not pile up connections.
// Only the client is kept: a core kept across reloads would keep serving old code.
const globalForDomain = globalThis as unknown as { db?: Db };

/** The domain core the web app reads through. The web never calls a Source itself. */
export function domain(): DomainCore {
  if (!globalForDomain.db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set; copy .env.example to .env");
    globalForDomain.db = createDb(url);
  }
  return createDomainCore({ db: globalForDomain.db, http: fetch });
}

/** The cache tag for everything a page shows from one Source; revalidated after that Source is ingested. */
export function sourceTag(sourceId: string) {
  return `source:${sourceId}`;
}

/**
 * The Overview, cached until any Source in it is ingested again. The cache stores JSON,
 * so moments come back as ISO strings.
 */
export const cachedOverview = unstable_cache(
  async () =>
    (await domain().getOverview()).map((block) => ({
      sourceId: block.sourceId,
      lastSucceededAt: block.lastSucceededAt?.toISOString() ?? null,
      items: block.items.map((item) => ({ ...item, publishedAt: item.publishedAt?.toISOString() ?? null })),
    })),
  ["overview"],
  { tags: sourceIds.map(sourceTag) },
);
