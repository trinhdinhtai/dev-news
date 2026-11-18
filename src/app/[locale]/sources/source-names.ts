import { FlameIcon, FolderGit2Icon, type LucideIcon } from "lucide-react";
import type { TimeWindow } from "@/domain";
import type messages from "@/i18n/messages/en.json";

/**
 * The numbers shown for each Item, read from its metrics. Their headings and units are
 * in the messages under Figures.
 */
export type Figure = keyof typeof messages.Figures;

/**
 * The kind of Item a Source puts up, which is how the sidebar groups Sources. Listed in
 * the order the sidebar shows them; a category without a Source is not shown. The names
 * are in the messages under Nav.categories.
 */
export const sourceCategories = ["code", "news", "articles", "videos"] as const;

export type SourceCategory = (typeof sourceCategories)[number];

/** A Source the interface can show; its text is in the messages under Sources. */
export type SourceId = keyof typeof messages.Sources;

/** How a Source appears on screen apart from its text, which the messages hold. */
export interface SourceDisplay {
  id: SourceId;
  /** The Source's own name, the same in every language. */
  name: string;
  category: SourceCategory;
  /** Icon for the sidebar. */
  icon: LucideIcon;
  figures: Figure[];
}

/** Every Source the interface shows, in the order of the Source config. */
export const sourceDisplays: SourceDisplay[] = [
  {
    id: "github-trending",
    name: "GitHub Trending",
    category: "code",
    icon: FolderGit2Icon,
    figures: ["starsGained", "stars", "forks"],
  },
  {
    id: "hacker-news",
    name: "Hacker News",
    category: "news",
    icon: FlameIcon,
    figures: ["points", "comments"],
  },
];

/** The Source with this id, if the interface knows it. */
export function findSourceDisplay(sourceId: string): SourceDisplay | undefined {
  return sourceDisplays.find((display) => display.id === sourceId);
}

/** Every Time Window in the order the switch shows them; the first is the default. */
export const timeWindows: readonly TimeWindow[] = ["day", "week"];
