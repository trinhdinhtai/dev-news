import { sourceFilters, type TimeWindow } from "@/domain";

/** One Source Ranking a Source page can show: its Time Window and filter, such as a GitHub language. */
export interface RankingView {
  sourceId: string;
  timeWindow: TimeWindow;
  /** Empty for the unfiltered ranking. */
  filter: string;
}

/**
 * The path segments after /sources/<id> that name a view. The day and the unfiltered
 * ranking are the defaults, so they take no segment: [], ["week"], ["python"], ["python", "week"].
 */
export function viewSegments({ timeWindow, filter }: Omit<RankingView, "sourceId">): string[] {
  return [...(filter ? [filter] : []), ...(timeWindow === "week" ? ["week"] : [])];
}

/** The Source page that shows a view. */
export function viewHref(view: RankingView) {
  return ["", "sources", view.sourceId, ...viewSegments(view)].join("/");
}

/** Every view a Source has: both Time Windows, unfiltered and for each of its filters. */
export function sourceViews(sourceId: string): RankingView[] {
  return ["", ...sourceFilters(sourceId).map((filter) => filter.id)].flatMap((filter) =>
    (["day", "week"] as const).map((timeWindow) => ({ sourceId, timeWindow, filter })),
  );
}

/** How a view's filter is named on screen, such as "C++"; undefined for the unfiltered view. */
export function filterLabel({ sourceId, filter }: RankingView): string | undefined {
  return sourceFilters(sourceId).find((candidate) => candidate.id === filter)?.label;
}

/** The view that path segments name, or undefined when the Source has no such view. */
export function parseView(sourceId: string, segments: readonly string[] = []): RankingView | undefined {
  const path = segments.join("/");
  return sourceViews(sourceId).find((view) => viewSegments(view).join("/") === path);
}
