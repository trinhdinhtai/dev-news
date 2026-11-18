/** One number shown for each Item, read from its metrics. */
export interface Figure {
  metric: string;
  /** The column heading. */
  label: string;
  /** Spoken after the number, and shown after it on narrow screens. */
  unit: string;
}

/** How a Source is named on screen, what its daily Source Ranking holds, and which figures it shows. */
export interface SourceDisplay {
  name: string;
  dayRanking: string;
  credit: string;
  itemLabel: string;
  figures: Figure[];
}

export const sourceDisplay: Record<string, SourceDisplay> = {
  "github-trending": {
    name: "GitHub Trending",
    dayRanking: "The repos that gained the most stars on GitHub today.",
    credit: "Rankings come from GitHub Trending; descriptions, stars and forks from the GitHub REST API.",
    itemLabel: "Repository",
    figures: [
      { metric: "starsGained", label: "Stars today", unit: "stars today" },
      { metric: "stars", label: "Stars", unit: "stars" },
      { metric: "forks", label: "Forks", unit: "forks" },
    ],
  },
  "hacker-news": {
    name: "Hacker News",
    dayRanking: "The highest-scored stories posted in the last 24 hours.",
    credit: "Rankings come from Algolia HN Search.",
    itemLabel: "Story",
    figures: [
      { metric: "points", label: "Points", unit: "points" },
      { metric: "comments", label: "Comments", unit: "comments" },
    ],
  },
};
