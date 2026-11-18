import { z } from "zod";
import type { Http } from "../../http";
import { fetchJson, fetchText } from "../fetch-source";
import type { FetchedItem, FetchedRanking, Secrets, SourceAdapter, TimeWindow } from "../types";

const SINCE: Record<TimeWindow, string> = { day: "daily", week: "weekly" };

/** What the trending page itself tells us: per spec #3 only the repo, its rank and the stars gained. */
const trendingRow = z.object({
  fullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  starsGained: z.number().int().nonnegative(),
});
type TrendingRow = z.infer<typeof trendingRow>;

const repoResponse = z.object({
  full_name: z.string(),
  html_url: z.url(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stargazers_count: z.number().int(),
  forks_count: z.number().int(),
});
type Repo = z.infer<typeof repoResponse>;

/**
 * Reads the repos off a trending page, in rank order. Throws when the page no longer
 * looks the way it did, so a changed layout fails the ingest instead of storing junk.
 */
function parseTrendingPage(html: string): TrendingRow[] {
  const articles = html.split('<article class="Box-row">').slice(1);
  if (articles.length === 0) throw new Error("GitHub Trending page has no repo rows; its layout may have changed");

  return articles.map((article, index) => {
    const name = /<h2 class="h3 lh-condensed">\s*<a [^>]*href="\/([^"]+)"/.exec(article)?.[1];
    const stars = /([\d,]+) stars (?:today|this week)/.exec(article)?.[1];
    const row = trendingRow.safeParse({ fullName: name, starsGained: stars && Number(stars.replaceAll(",", "")) });
    if (!row.success) throw new Error(`GitHub Trending row ${index + 1} is unreadable; its layout may have changed`);
    return row.data;
  });
}

async function fetchTrending(http: Http, timeWindow: TimeWindow): Promise<TrendingRow[]> {
  const url = new URL("https://github.com/trending");
  url.searchParams.set("since", SINCE[timeWindow]);
  return parseTrendingPage(await fetchText(http, url));
}

async function fetchRepo(http: Http, fullName: string, secrets: Secrets): Promise<Repo> {
  const headers: Record<string, string> = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" };
  // The token goes to the REST API only, never to the trending page.
  if (secrets.githubToken) headers.authorization = `Bearer ${secrets.githubToken}`;
  return repoResponse.parse(await fetchJson(http, new URL(`https://api.github.com/repos/${fullName}`), headers));
}

function toItem(row: TrendingRow, repo: Repo): FetchedItem {
  return {
    externalId: row.fullName,
    title: row.fullName,
    url: repo.html_url,
    description: repo.description,
    programmingLanguage: repo.language,
    metrics: { starsGained: row.starsGained, stars: repo.stargazers_count, forks: repo.forks_count },
  };
}

export const githubTrending: SourceAdapter = {
  id: "github-trending",
  regionalLanguage: null,
  // Trending moves slowly, and each ingest spends about 30 REST API calls.
  intervalMinutes: 60,
  async fetchRankings(http, _now, secrets) {
    const windows: TimeWindow[] = ["day", "week"];
    const pages = await Promise.all(windows.map((timeWindow) => fetchTrending(http, timeWindow)));

    // A repo trending in both Time Windows is looked up once, and one at a time, so
    // hitting the rate limit stops the ingest at the first refused call.
    const names = [...new Set(pages.flat().map((row) => row.fullName))];
    const repos = new Map<string, Repo>();
    for (const name of names) repos.set(name, await fetchRepo(http, name, secrets));

    return windows.map(
      (timeWindow, i): FetchedRanking => ({
        timeWindow,
        filter: "",
        // GitHub's own order mixes in other signals; rank by stars gained in the Time Window instead.
        items: pages[i]
          .toSorted((a, b) => b.starsGained - a.starsGained)
          .map((row) => toItem(row, repos.get(row.fullName)!)),
      }),
    );
  },
};
