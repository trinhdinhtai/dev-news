import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { sourceIds, type TimeWindow } from "@/domain";
import { Link } from "@/i18n/navigation";
import { cachedRanking } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { LocalTime } from "../local-time";
import { NoRanking } from "./no-ranking";
import { RankingLedger } from "./ranking-ledger";
import { sourceDisplay, sourceHref, timeWindowTitle, timeWindows } from "./source-names";

/**
 * The Sources each Time Window's route builds a static page for; the route's folder names
 * the Time Window. Each page is rebuilt when collection revalidates that Source's tag.
 */
export function sourceStaticParams() {
  return sourceIds.map((sourceId) => ({ sourceId }));
}

export function sourcePageMetadata(sourceId: string, timeWindow: TimeWindow): Metadata {
  const display = sourceDisplay[sourceId];
  if (!display) return {};
  return {
    title: `${display.name} ${timeWindowTitle(timeWindow)}, Dev News`,
    description: display.rankings[timeWindow].description,
  };
}

/** Links to the same Source's other Time Windows; the current one is marked as the page. */
function TimeWindowSwitch({ sourceId, current }: { sourceId: string; current: TimeWindow }) {
  return (
    <nav aria-label="Time Window" className="inline-flex w-fit rounded-lg border bg-muted p-0.5">
      {timeWindows.map((option) => {
        const active = option.id === current;
        return (
          <Link
            key={option.id}
            href={sourceHref(sourceId, option.id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** A Source's page: its Source Ranking for one Time Window, with a switch to the other. */
export async function SourcePage({
  locale,
  sourceId,
  timeWindow,
}: {
  locale: string;
  sourceId: string;
  timeWindow: TimeWindow;
}) {
  setRequestLocale(locale);
  const display = sourceDisplay[sourceId];
  if (!display || !sourceIds.includes(sourceId)) notFound();

  const ranking = await cachedRanking(sourceId, timeWindow);
  const { description } = display.rankings[timeWindow];
  const windowTitle = timeWindowTitle(timeWindow);

  return (
    <div id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
              {display.name}
            </h1>
            <p className="max-w-prose text-muted-foreground">{description}</p>
          </div>
          {ranking.lastSucceededAt && (
            <Badge variant="outline">
              Updated <LocalTime iso={ranking.lastSucceededAt} />
            </Badge>
          )}
        </div>
        <TimeWindowSwitch sourceId={sourceId} current={timeWindow} />
      </div>

      {ranking.items.length === 0 ? (
        <NoRanking command={`pnpm ingest ${sourceId}`}>
          The {display.name} ranking for {windowTitle} appears here after its first collection run.
        </NoRanking>
      ) : (
        <Card className="py-0">
          <RankingLedger
            display={display}
            timeWindow={timeWindow}
            items={ranking.items}
            caption={`${display.name} Source Ranking, ${windowTitle}`}
          />
        </Card>
      )}

      <footer className="text-sm text-muted-foreground">
        <p>
          {display.credit} Each {display.itemLabel.toLowerCase()} opens at its source in a new tab.
        </p>
      </footer>
    </div>
  );
}
