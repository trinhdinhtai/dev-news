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

/** A filter a Source ranks on its own, such as one GitHub Trending language. */
export interface SourceFilter {
  /** What its Source Rankings are stored under, also used in the app's URLs, such as "cpp". */
  id: string;
  /** Its name on screen, the same in every interface language, such as "C++". */
  label: string;
}

/** Credentials some Sources need; each is optional so an unused one never has to be set. */
export interface Secrets {
  /** A GitHub token for the REST API, which allows 5,000 calls an hour instead of 60. */
  githubToken?: string;
}

/** Everything the domain core needs to know about one Source. */
export interface SourceAdapter {
  id: string;
  /** The language a Regional Source belongs to; null for every other Source. */
  regionalLanguage: string | null;
  /**
   * The filters it ranks besides its unfiltered Source Ranking, such as GitHub Trending's
   * languages; none for most Sources.
   */
  filters?: readonly SourceFilter[];
  /** How often the scheduled collection run ingests this Source, in minutes. */
  intervalMinutes: number;
  fetchRankings(http: Http, now: Date, secrets: Secrets): Promise<FetchedRanking[]>;
}
