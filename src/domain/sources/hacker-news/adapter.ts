import { z } from "zod";
import type { Http } from "../../http";
import { fetchJson } from "../fetch-source";
import type { FetchedItem, FetchedRanking, SourceAdapter, TimeWindow } from "../types";

const RANKING_SIZE = 30;
const DAY_SECONDS = 24 * 60 * 60;
/** How far back each Time Window reaches: the last 24 hours, or the last 7 days. */
const WINDOW_SECONDS: Record<TimeWindow, number> = { day: DAY_SECONDS, week: 7 * DAY_SECONDS };

const searchResponse = z.object({
  hits: z.array(
    z.object({
      objectID: z.string(),
      title: z.string(),
      // Ask HN and similar stories have no external link.
      url: z.string().nullish(),
      points: z.number().int(),
      num_comments: z.number().int().nullish(),
      created_at_i: z.number().int(),
    }),
  ),
});

/** The best stories created since `sinceSeconds`, as Algolia HN Search reports them. */
async function bestStoriesSince(http: Http, sinceSeconds: number): Promise<FetchedItem[]> {
  const url = new URL("https://hn.algolia.com/api/v1/search");
  url.searchParams.set("tags", "story");
  url.searchParams.set("numericFilters", `created_at_i>${sinceSeconds}`);
  url.searchParams.set("hitsPerPage", String(RANKING_SIZE));

  const { hits } = searchResponse.parse(await fetchJson(http, url));

  return hits
    .toSorted((a, b) => b.points - a.points)
    .map((hit) => ({
      externalId: hit.objectID,
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      publishedAt: new Date(hit.created_at_i * 1000),
      metrics: { points: hit.points, comments: hit.num_comments ?? 0 },
    }));
}

export const hackerNews: SourceAdapter = {
  id: "hacker-news",
  regionalLanguage: null,
  // The day's best stories move quickly.
  intervalMinutes: 30,
  async fetchRankings(http, now) {
    const nowSeconds = Math.floor(now.getTime() / 1000);
    // One after the other, so the Source is asked one thing at a time.
    const rankings: FetchedRanking[] = [];
    for (const timeWindow of ["day", "week"] as const) {
      const items = await bestStoriesSince(http, nowSeconds - WINDOW_SECONDS[timeWindow]);
      rankings.push({ timeWindow, filter: "", items });
    }
    return rankings;
  },
};
