import type { Metrics } from "../db/schema";
import type { Http } from "../http";

export type TimeWindow = "day" | "week";

/** One Item as a Source reported it, before it is stored. */
export interface FetchedItem {
  externalId: string;
  title: string;
  url: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  contentLanguage?: string | null;
  programmingLanguage?: string | null;
  publishedAt?: Date | null;
  metrics: Metrics;
}

/** A Source Ranking as fetched: Items in rank order, best first. */
export interface FetchedRanking {
  timeWindow: TimeWindow;
  /** Empty for an unfiltered ranking. */
  filter: string;
  items: FetchedItem[];
}

/** Everything the domain core needs to know about one Source. */
export interface SourceAdapter {
  id: string;
  /** The language a Regional Source belongs to; null for every other Source. */
  regionalLanguage: string | null;
  fetchRankings(http: Http, now: Date): Promise<FetchedRanking[]>;
}
