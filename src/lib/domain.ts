import { unstable_cache } from "next/cache";
import { createDomainCore, type DomainCore, type RankedItem, sourceIds, type TimeWindow } from "@/domain";
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

/** A Source's ranked Items and success time as the cache stores them: JSON, so moments become ISO strings. */
function toCached(lastSucceededAt: Date | null, items: RankedItem[]) {
  return {
    lastSucceededAt: lastSucceededAt?.toISOString() ?? null,
    items: items.map((item) => ({ ...item, publishedAt: item.publishedAt?.toISOString() ?? null })),
  };
}

/**
 * A Source's Source Ranking for one Time Window and filter (empty for the unfiltered one),
 * cached until that Source is ingested again. The cache stores JSON, so moments come back
 * as ISO strings.
 */
export function cachedRanking(sourceId: string, timeWindow: TimeWindow, filter: string) {
  return unstable_cache(
    async () => {
      const ranking = await domain().getSourceRanking({ sourceId, timeWindow, filter });
      return toCached(ranking.lastSucceededAt, ranking.items);
    },
    [`${timeWindow}-ranking`, sourceId, filter],
    { tags: [sourceTag(sourceId)] },
  )();
}

/**
 * The Overview for one interface language, cached until any Source in it is ingested
 * again. The cache stores JSON, so moments come back as ISO strings.
 */
export function cachedOverview(uiLanguage: string) {
  return unstable_cache(
    async () =>
      (await domain().getOverview({ uiLanguage })).map((block) => ({
        sourceId: block.sourceId,
        ...toCached(block.lastSucceededAt, block.items),
      })),
    ["overview", uiLanguage],
    { tags: sourceIds.map(sourceTag) },
  )();
}
