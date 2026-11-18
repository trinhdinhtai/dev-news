import { FlameIcon, FolderGit2Icon, type LucideIcon } from "lucide-react";
import type { TimeWindow } from "@/domain";

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

/** What one of a Source's Source Rankings holds and which figures it shows. */
export interface RankingDisplay {
  description: string;
  figures: Figure[];
}

/** How a Source is named on screen and how each of its Source Rankings is shown. */
export interface SourceDisplay {
  name: string;
  category: SourceCategory;
  /** Icon for the sidebar. */
  icon: LucideIcon;
  rankings: Record<TimeWindow, RankingDisplay>;
  credit: string;
  itemLabel: string;
}

/** Every Time Window in the order the switch shows them; the first is the default. */
export const timeWindows = [
  { id: "day", label: "Today", title: "today" },
  { id: "week", label: "This week", title: "this week" },
] as const satisfies readonly { id: TimeWindow; label: string; title: string }[];

/** How a page title names a Time Window: "today" or "this week". */
export function timeWindowTitle(timeWindow: TimeWindow) {
  return timeWindows.find((option) => option.id === timeWindow)!.title;
}

/** The Source page for a Time Window. The day is the default, so it keeps the bare path. */
export function sourceHref(sourceId: string, timeWindow: TimeWindow) {
  return timeWindow === "day" ? `/sources/${sourceId}` : `/sources/${sourceId}/${timeWindow}`;
}

const repoFigures = (gained: string): Figure[] => [
  { metric: "starsGained", label: `Stars ${gained}`, unit: `stars ${gained}` },
  { metric: "stars", label: "Stars", unit: "stars" },
  { metric: "forks", label: "Forks", unit: "forks" },
];

const storyFigures: Figure[] = [
  { metric: "points", label: "Points", unit: "points" },
  { metric: "comments", label: "Comments", unit: "comments" },
];

export const sourceDisplay: Record<string, SourceDisplay> = {
  "github-trending": {
    name: "GitHub Trending",
    category: "code",
    icon: FolderGit2Icon,
    rankings: {
      day: { description: "The repos that gained the most stars on GitHub today.", figures: repoFigures("today") },
      week: {
        description: "The repos that gained the most stars on GitHub this week.",
        figures: repoFigures("this week"),
      },
    },
    credit: "Rankings come from GitHub Trending; descriptions, stars and forks from the GitHub REST API.",
    itemLabel: "Repository",
  },
  "hacker-news": {
    name: "Hacker News",
    category: "news",
    icon: FlameIcon,
    rankings: {
      day: { description: "The highest-scored stories posted in the last 24 hours.", figures: storyFigures },
      week: { description: "The highest-scored stories posted in the last 7 days.", figures: storyFigures },
    },
    credit: "Rankings come from Algolia HN Search.",
    itemLabel: "Story",
  },
};
