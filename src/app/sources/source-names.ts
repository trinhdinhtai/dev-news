import { FlameIcon, FolderGit2Icon, type LucideIcon } from "lucide-react";

/** One number shown for each Item, read from its metrics. */
export interface Figure {
  metric: string;
  /** The column heading. */
  label: string;
  /** Spoken after the number, and shown after it on narrow screens. */
  unit: string;
}

/**
 * The kind of Item a Source puts up, which is how the sidebar groups Sources.
 * Listed in the order the sidebar shows them; a category without a Source is not shown.
 */
export const sourceCategories = [
  { id: "code", label: "Code" },
  { id: "news", label: "News" },
  { id: "articles", label: "Articles" },
  { id: "videos", label: "Videos" },
] as const;

export type SourceCategory = (typeof sourceCategories)[number]["id"];

/** How a Source is named on screen, what its daily Source Ranking holds, and which figures it shows. */
export interface SourceDisplay {
  name: string;
  category: SourceCategory;
  /** Icon for the sidebar. */
  icon: LucideIcon;
  dayRanking: string;
  credit: string;
  itemLabel: string;
  figures: Figure[];
}

export const sourceDisplay: Record<string, SourceDisplay> = {
  "github-trending": {
    name: "GitHub Trending",
    category: "code",
    icon: FolderGit2Icon,
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
    category: "news",
    icon: FlameIcon,
    dayRanking: "The highest-scored stories posted in the last 24 hours.",
    credit: "Rankings come from Algolia HN Search.",
    itemLabel: "Story",
    figures: [
      { metric: "points", label: "Points", unit: "points" },
      { metric: "comments", label: "Comments", unit: "comments" },
    ],
  },
};
