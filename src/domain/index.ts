import { and, asc, desc, eq, lt, lte, sql } from "drizzle-orm";
import type { Db } from "./db/client";
import { items, type Metrics, rawResponses, sourceRankings, sources } from "./db/schema";
import type { Http } from "./http";
import { adapters, findAdapter } from "./sources";
import type { FetchedRanking, Secrets, SourceAdapter, TimeWindow } from "./sources/types";

/** Every Source the domain core can ingest. */
export const sourceIds: readonly string[] = adapters.map((adapter) => adapter.id);

export type { Db } from "./db/client";
export type { Http } from "./http";
export type { Secrets, TimeWindow } from "./sources/types";

/** How a Source's collection is going: when it last succeeded and when and why it last failed. */
export interface SourceStatus {
  sourceId: string;
  lastSucceededAt: Date | null;
  lastError: string | null;
  lastErrorAt: Date | null;
}

/** The most of an error message kept on a Source; enough to diagnose, small enough to show. */
const ERROR_LENGTH = 2000;

/**
 * How early a Source counts as due. GitHub Actions starts scheduled runs late and
 * unevenly, so a run a few minutes short of the interval still ingests.
 */
const DUE_TOLERANCE_MINUTES = 5;

/** What a collection run did with one Source. */
export type CollectResult = { sourceId: string; ok: true } | { sourceId: string; ok: false; error: string };

/** How long raw Source responses are kept. */
const RAW_RESPONSE_DAYS = 7;

/** One answer a Source gave during an ingest. */
export interface RawResponse {
  sourceId: string;
  fetchedAt: Date;
  url: string;
  status: number;
  body: string;
}

/** What one request got back, before it is stored against its Source and ingest. */
type RawAnswer = Omit<RawResponse, "sourceId" | "fetchedAt">;

/** Wraps the HTTP layer so every answer it gets is kept, whether or not the adapter can read it. */
function recordingHttp(http: Http) {
  const answers: RawAnswer[] = [];
  const recording: Http = async (url, init) => {
    const response = await http(url, init);
    answers.push({ url, status: response.status, body: await response.clone().text() });
    return response;
  };
  return { http: recording, answers };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Whether a Source's interval has passed since it was last tried. A failed try counts,
 * so a failing Source is retried at its own pace rather than on every scheduled run.
 */
function isDue(adapter: SourceAdapter, status: SourceStatus | undefined, now: Date) {
  const tries = [status?.lastSucceededAt, status?.lastErrorAt].filter((moment) => moment != null);
  if (tries.length === 0) return true;
  const lastTry = Math.max(...tries.map((moment) => moment.getTime()));
  return now.getTime() - lastTry >= (adapter.intervalMinutes - DUE_TOLERANCE_MINUTES) * 60 * 1000;
}

export interface RankedItem {
  rank: number;
  title: string;
  url: string;
  description: string | null;
  thumbnailUrl: string | null;
  programmingLanguage: string | null;
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

/** The columns that make up a RankedItem, shared by every read of a Source Ranking. */
const rankedItemColumns = {
  rank: sourceRankings.rank,
  title: items.title,
  url: items.url,
  description: items.description,
  thumbnailUrl: items.thumbnailUrl,
  programmingLanguage: items.programmingLanguage,
  publishedAt: items.publishedAt,
  metrics: sourceRankings.metrics,
};

/** How many Items of each Source the Overview shows. */
const OVERVIEW_SIZE = 5;

/** One Source's block on the Overview: the top of its daily Source Ranking. */
export interface OverviewBlock {
  sourceId: string;
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
        programmingLanguage: item.programmingLanguage ?? null,
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
        programmingLanguage: sql`excluded.programming_language`,
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
export function createDomainCore({ db, http, secrets = {} }: { db: Db; http: Http; secrets?: Secrets }) {
  async function ingest(sourceId: string, now: Date): Promise<void> {
    const adapter = findAdapter(sourceId);
    if (!adapter) throw new Error(`Unknown Source: ${sourceId}`);

    const recorder = recordingHttp(http);
    try {
      // Fetch and validate everything first, so a bad answer leaves the stored rankings untouched.
      const rankings = await adapter.fetchRankings(recorder.http, now, secrets);

      await db.transaction(async (tx) => {
        await tx
          .insert(sources)
          .values({ id: adapter.id, regionalLanguage: adapter.regionalLanguage, lastSucceededAt: now })
          .onConflictDoUpdate({
            target: sources.id,
            set: { regionalLanguage: adapter.regionalLanguage, lastSucceededAt: now },
          });
        for (const ranking of rankings) await replaceRanking(tx, adapter, ranking, now);
        await keepRawResponses(tx, adapter.id, now, recorder.answers);
      });
    } catch (error) {
      // The last good Source Ranking and its success time stay; only the failure is recorded.
      const lastError = errorMessage(error).slice(0, ERROR_LENGTH);
      await db
        .transaction(async (tx) => {
          await tx
            .insert(sources)
            .values({ id: adapter.id, regionalLanguage: adapter.regionalLanguage, lastError, lastErrorAt: now })
            .onConflictDoUpdate({ target: sources.id, set: { lastError, lastErrorAt: now } });
          await keepRawResponses(tx, adapter.id, now, recorder.answers);
        })
        // If even that fails (the database is down, say), the ingest's own error is the one to report.
        .catch(() => {});
      throw error;
    }
  }

  /** Stores an ingest's raw responses and drops those older than RAW_RESPONSE_DAYS. The Source row must exist. */
  async function keepRawResponses(tx: Tx, sourceId: string, now: Date, answers: RawAnswer[]) {
    if (answers.length > 0) {
      await tx.insert(rawResponses).values(answers.map((answer) => ({ sourceId, fetchedAt: now, ...answer })));
    }
    const cutoff = new Date(now.getTime() - RAW_RESPONSE_DAYS * 24 * 60 * 60 * 1000);
    await tx.delete(rawResponses).where(and(eq(rawResponses.sourceId, sourceId), lt(rawResponses.fetchedAt, cutoff)));
  }

  /** The raw responses kept for a Source, newest ingest first, each ingest's in request order. */
  async function getRawResponses(sourceId: string): Promise<RawResponse[]> {
    return db
      .select({
        sourceId: rawResponses.sourceId,
        fetchedAt: rawResponses.fetchedAt,
        url: rawResponses.url,
        status: rawResponses.status,
        body: rawResponses.body,
      })
      .from(rawResponses)
      .where(eq(rawResponses.sourceId, sourceId))
      .orderBy(desc(rawResponses.fetchedAt), asc(rawResponses.id));
  }

  /**
   * One collection run: ingests every due Source, or the named ones, one after another.
   * A Source that fails is recorded and reported; it never stops the others.
   */
  async function collect(now: Date, { sourceIds: named }: { sourceIds?: readonly string[] } = {}) {
    const statuses = await getSourceStatuses();
    const chosen = adapters.filter((adapter) =>
      named
        ? named.includes(adapter.id)
        : isDue(
            adapter,
            statuses.find((status) => status.sourceId === adapter.id),
            now,
          ),
    );

    const results: CollectResult[] = [];
    for (const adapter of chosen) {
      try {
        await ingest(adapter.id, now);
        results.push({ sourceId: adapter.id, ok: true });
      } catch (error) {
        results.push({ sourceId: adapter.id, ok: false, error: errorMessage(error) });
      }
    }
    return results;
  }

  /** Every Source in the order of the Source config, including those never ingested. */
  async function getSourceStatuses(): Promise<SourceStatus[]> {
    const rows = await db.select().from(sources);
    return adapters.map(({ id }) => {
      const row = rows.find((candidate) => candidate.id === id);
      return {
        sourceId: id,
        lastSucceededAt: row?.lastSucceededAt ?? null,
        lastError: row?.lastError ?? null,
        lastErrorAt: row?.lastErrorAt ?? null,
      };
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
      .select(rankedItemColumns)
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

  /**
   * The top Items of every Source's daily Source Ranking, Sources in the default order
   * of the Source config. A Source with no ranking yet is left out; scores are never
   * compared across Sources.
   */
  async function getOverview(): Promise<OverviewBlock[]> {
    const rows = await db
      .select({
        sourceId: sourceRankings.sourceId,
        lastSucceededAt: sources.lastSucceededAt,
        item: rankedItemColumns,
      })
      .from(sourceRankings)
      .innerJoin(items, eq(items.id, sourceRankings.itemId))
      .innerJoin(sources, eq(sources.id, sourceRankings.sourceId))
      .where(
        and(
          eq(sourceRankings.timeWindow, "day"),
          eq(sourceRankings.filter, ""),
          lte(sourceRankings.rank, OVERVIEW_SIZE),
        ),
      )
      .orderBy(asc(sourceRankings.rank));

    return adapters.flatMap(({ id }): OverviewBlock[] => {
      const ranked = rows.filter((row) => row.sourceId === id);
      if (ranked.length === 0) return [];
      return [
        {
          sourceId: id,
          lastSucceededAt: ranked[0].lastSucceededAt,
          items: ranked.map((row) => row.item),
        },
      ];
    });
  }

  return { ingest, collect, getSourceRanking, getOverview, getSourceStatuses, getRawResponses };
}

export type DomainCore = ReturnType<typeof createDomainCore>;
