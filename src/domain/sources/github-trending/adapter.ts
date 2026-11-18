import { z } from "zod";
import type { Http } from "../../http";
import { fetchJson, fetchText } from "../fetch-source";
import type { FetchedItem, FetchedRanking, Secrets, SourceAdapter, SourceFilter, TimeWindow } from "../types";

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

/** A programming language GitHub Trending ranks on its own page; its Source Rankings are filtered by it. */
export interface TrendingLanguage extends SourceFilter {
  /** GitHub's own path segment for it, such as "c++" or "c%23". */
  path: string;
}

/** The languages the app collects, besides the ranking of every language. */
export const trendingLanguages: readonly TrendingLanguage[] = [
  { id: "python", label: "Python", path: "python" },
  { id: "typescript", label: "TypeScript", path: "typescript" },
  { id: "javascript", label: "JavaScript", path: "javascript" },
  { id: "go", label: "Go", path: "go" },
  { id: "rust", label: "Rust", path: "rust" },
  { id: "java", label: "Java", path: "java" },
  { id: "cpp", label: "C++", path: "c++" },
  { id: "csharp", label: "C#", path: "c%23" },
];

async function fetchTrending(http: Http, language: TrendingLanguage | null, timeWindow: TimeWindow) {
  const url = new URL(language ? `https://github.com/trending/${language.path}` : "https://github.com/trending");
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

/**
 * GitHub Trending, ranked for every language and for each of `languages`, in both
 * Time Windows. Each is its own Source Ranking, filtered by the language.
 */
export function createGithubTrending({ languages }: { languages: readonly TrendingLanguage[] }): SourceAdapter {
  return {
    id: "github-trending",
    regionalLanguage: null,
    filters: languages.map(({ id, label }) => ({ id, label })),
    // Trending moves slowly, and each ingest spends a REST call on every distinct repo of
    // its pages: a few hundred with the eight languages, well inside a token's 5,000 an hour.
    intervalMinutes: 60,
    async fetchRankings(http, _now, secrets) {
      const pages: { language: TrendingLanguage | null; timeWindow: TimeWindow; rows: TrendingRow[] }[] = [];
      // One page at a time, so GitHub is asked one thing at a time.
      for (const language of [null, ...languages]) {
        for (const timeWindow of ["day", "week"] as const) {
          pages.push({ language, timeWindow, rows: await fetchTrending(http, language, timeWindow) });
        }
      }

      // A repo on several pages is looked up once, and one at a time, so hitting the
      // rate limit stops the ingest at the first refused call.
      const names = [...new Set(pages.flatMap((page) => page.rows.map((row) => row.fullName)))];
      const repos = new Map<string, Repo>();
      for (const name of names) repos.set(name, await fetchRepo(http, name, secrets));

      return pages.map(
        (page): FetchedRanking => ({
          timeWindow: page.timeWindow,
          filter: page.language?.id ?? "",
          // GitHub's own order mixes in other signals; rank by stars gained in the Time Window instead.
          items: page.rows
            .toSorted((a, b) => b.starsGained - a.starsGained)
            .map((row) => toItem(row, repos.get(row.fullName)!)),
        }),
      );
    },
  };
}

export const githubTrending = createGithubTrending({ languages: trendingLanguages });
