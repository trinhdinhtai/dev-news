import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "./db/client";
import { items, type Metrics, sourceRankings, sources } from "./db/schema";
import type { Http } from "./http";
import { adapters, findAdapter } from "./sources";
import type { FetchedRanking, SourceAdapter, TimeWindow } from "./sources/types";

/** Every Source the domain core can ingest. */
export const sourceIds: readonly string[] = adapters.map((adapter) => adapter.id);

export type { Db } from "./db/client";
export type { Http } from "./http";
export type { TimeWindow } from "./sources/types";

export interface RankedItem {
  rank: number;
  title: string;
  url: string;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  metrics: Metrics;
}

export interface SourceRanking {
  sourceId: string;
  timeWindow: TimeWindow;
  /** When this Source last ingested successfully; null if it never has. */
  lastSucceededAt: Date | null;
  items: RankedItem[];
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Upserts the ranking's Items, then replaces the stored Source Ranking with it whole. */
async function replaceRanking(tx: Tx, adapter: SourceAdapter, ranking: FetchedRanking, now: Date) {
  const key = and(
    eq(sourceRankings.sourceId, adapter.id),
    eq(sourceRankings.timeWindow, ranking.timeWindow),
    eq(sourceRankings.filter, ranking.filter),
  );
  await tx.delete(sourceRankings).where(key);
  if (ranking.items.length === 0) return;

  const stored = await tx
    .insert(items)
    .values(
      ranking.items.map((item) => ({
        sourceId: adapter.id,
        externalId: item.externalId,
        title: item.title,
        url: item.url,
        description: item.description ?? null,
        thumbnailUrl: item.thumbnailUrl ?? null,
        contentLanguage: item.contentLanguage ?? null,
        publishedAt: item.publishedAt ?? null,
        metrics: item.metrics,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: [items.sourceId, items.externalId],
      set: {
        title: sql`excluded.title`,
        url: sql`excluded.url`,
        description: sql`excluded.description`,
        thumbnailUrl: sql`excluded.thumbnail_url`,
        contentLanguage: sql`excluded.content_language`,
        publishedAt: sql`excluded.published_at`,
        metrics: sql`excluded.metrics`,
        updatedAt: sql`excluded.updated_at`,
      },
    })
    .returning({ id: items.id, externalId: items.externalId });
  const idByExternalId = new Map(stored.map((row) => [row.externalId, row.id]));

  await tx.insert(sourceRankings).values(
    ranking.items.map((item, index) => ({
      sourceId: adapter.id,
      timeWindow: ranking.timeWindow,
      filter: ranking.filter,
      rank: index + 1,
      itemId: idByExternalId.get(item.externalId)!,
      metrics: item.metrics,
      fetchedAt: now,
    })),
  );
}

/**
 * The domain core. Its write side, `ingest`, pulls a Source through its adapter;
 * its read side answers the web app. Nothing outside it talks to a Source.
 */
export function createDomainCore({ db, http }: { db: Db; http: Http }) {
  async function ingest(sourceId: string, now: Date): Promise<void> {
    const adapter = findAdapter(sourceId);
    if (!adapter) throw new Error(`Unknown Source: ${sourceId}`);

    // Fetch and validate everything first, so a bad answer leaves the stored rankings untouched.
    const rankings = await adapter.fetchRankings(http, now);

    await db.transaction(async (tx) => {
      await tx
        .insert(sources)
        .values({ id: adapter.id, regionalLanguage: adapter.regionalLanguage, lastSucceededAt: now })
        .onConflictDoUpdate({
          target: sources.id,
          set: { regionalLanguage: adapter.regionalLanguage, lastSucceededAt: now },
        });
      for (const ranking of rankings) await replaceRanking(tx, adapter, ranking, now);
    });
  }

  async function getSourceRanking({
    sourceId,
    timeWindow,
  }: {
    sourceId: string;
    timeWindow: TimeWindow;
  }): Promise<SourceRanking> {
    const [source] = await db.select().from(sources).where(eq(sources.id, sourceId));
    const rows = await db
      .select({
        rank: sourceRankings.rank,
        title: items.title,
        url: items.url,
        description: items.description,
        thumbnailUrl: items.thumbnailUrl,
        publishedAt: items.publishedAt,
        metrics: sourceRankings.metrics,
      })
      .from(sourceRankings)
      .innerJoin(items, eq(items.id, sourceRankings.itemId))
      .where(
        and(
          eq(sourceRankings.sourceId, sourceId),
          eq(sourceRankings.timeWindow, timeWindow),
          eq(sourceRankings.filter, ""),
        ),
      )
      .orderBy(asc(sourceRankings.rank));

    return { sourceId, timeWindow, lastSucceededAt: source?.lastSucceededAt ?? null, items: rows };
  }

  return { ingest, getSourceRanking };
}

export type DomainCore = ReturnType<typeof createDomainCore>;
