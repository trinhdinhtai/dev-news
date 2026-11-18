import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { sourceIds, type TimeWindow } from "@/domain";
import { Link } from "@/i18n/navigation";
import { cachedRanking } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { LocalTime } from "../local-time";
import { NoRanking } from "./no-ranking";
import { RankingLedger } from "./ranking-ledger";
import { findSourceDisplay, sourceHref, timeWindows } from "./source-names";

/**
 * The Sources each Time Window's route builds a static page for; the route's folder names
 * the Time Window. Each page is rebuilt when collection revalidates that Source's tag.
 */
export function sourceStaticParams() {
  return sourceIds.map((sourceId) => ({ sourceId }));
}

export async function sourcePageMetadata(locale: Locale, sourceId: string, timeWindow: TimeWindow): Promise<Metadata> {
  const display = findSourceDisplay(sourceId);
  if (!display) return {};
  const t = await getTranslations({ locale });
  return {
    title: t("Metadata.sourceTitle", { source: display.name, window: timeWindow }),
    description: t(`Sources.${display.id}.description`, { window: timeWindow }),
  };
}

/** Links to the same Source's other Time Windows; the current one is marked as the page. */
async function TimeWindowSwitch({ sourceId, current }: { sourceId: string; current: TimeWindow }) {
  const t = await getTranslations("Ranking");
  return (
    <nav aria-label={t("timeWindow")} className="inline-flex w-fit rounded-lg border bg-muted p-0.5">
      {timeWindows.map((option) => {
        const active = option === current;
        return (
          <Link
            key={option}
            href={sourceHref(sourceId, option)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("window", { window: option })}
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
  locale: Locale;
  sourceId: string;
  timeWindow: TimeWindow;
}) {
  setRequestLocale(locale);
  const display = findSourceDisplay(sourceId);
  if (!display || !sourceIds.includes(sourceId)) notFound();

  const t = await getTranslations();
  const ranking = await cachedRanking(sourceId, timeWindow);

  return (
    <div id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
              {display.name}
            </h1>
            <p className="max-w-prose text-muted-foreground">
              {t(`Sources.${display.id}.description`, { window: timeWindow })}
            </p>
          </div>
          {ranking.lastSucceededAt && (
            <Badge variant="outline">
              {t("Ranking.updated")} <LocalTime iso={ranking.lastSucceededAt} />
            </Badge>
          )}
        </div>
        <TimeWindowSwitch sourceId={sourceId} current={timeWindow} />
      </div>

      {ranking.items.length === 0 ? (
        <NoRanking command={`pnpm ingest ${sourceId}`}>
          {t("Ranking.noRanking", { source: display.name, window: timeWindow })}
        </NoRanking>
      ) : (
        <Card className="py-0">
          <RankingLedger
            display={display}
            timeWindow={timeWindow}
            items={ranking.items}
            caption={t("Ranking.caption", { source: display.name, window: timeWindow })}
          />
        </Card>
      )}

      <footer className="text-sm text-muted-foreground">
        <p>
          {t(`Sources.${display.id}.credit`)}{" "}
          {t("Ranking.opensAtSource", { item: t(`Sources.${display.id}.item`).toLowerCase() })}
        </p>
      </footer>
    </div>
  );
}
