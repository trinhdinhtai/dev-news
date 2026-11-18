import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { sourceFilters, sourceIds } from "@/domain";
import { Link } from "@/i18n/navigation";
import { cachedRanking } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { LocalTime } from "../local-time";
import { NoRanking } from "./no-ranking";
import { RankingLedger } from "./ranking-ledger";
import { filterLabel, type RankingView, sourceViews, viewHref, viewSegments } from "./ranking-view";
import { findSourceDisplay, timeWindows } from "./source-names";

/**
 * One static page per Source and view: both Time Windows, unfiltered and for each of the
 * Source's filters. Each page is rebuilt when collection revalidates that Source's tag.
 */
export function sourceStaticParams() {
  return sourceIds.flatMap((sourceId) =>
    sourceViews(sourceId).map((view) => ({ sourceId, view: viewSegments(view) })),
  );
}

/** The Source's name, followed by the filter's when the view is filtered: "GitHub Trending · Python". */
function viewName(name: string, view: RankingView) {
  const label = filterLabel(view);
  return label ? `${name} · ${label}` : name;
}

export async function sourcePageMetadata(locale: Locale, view: RankingView): Promise<Metadata> {
  const display = findSourceDisplay(view.sourceId);
  if (!display) return {};
  const t = await getTranslations({ locale });
  return {
    title: t("Metadata.sourceTitle", { source: viewName(display.name, view), window: view.timeWindow }),
    description: t(`Sources.${display.id}.description`, { window: view.timeWindow }),
  };
}

/** One link of a view switch. */
interface ViewLink {
  key: string;
  view: RankingView;
  text: ReactNode;
  active: boolean;
}

/** A row of links to other views; the current one is marked as the page. */
function ViewLinks({ label, links }: { label: string; links: ViewLink[] }) {
  return (
    <nav aria-label={label} className="flex w-fit max-w-full flex-wrap gap-0.5 rounded-lg border bg-muted p-0.5">
      {links.map(({ key, view, text, active }) => (
        <Link
          key={key}
          href={viewHref(view)}
          aria-current={active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {text}
        </Link>
      ))}
    </nav>
  );
}

/**
 * A Source's page: one of its Source Rankings, with a switch between Time Windows and,
 * for a Source with filters, between them. Each switch keeps the other's choice.
 */
export async function SourcePage({ locale, view }: { locale: Locale; view: RankingView }) {
  setRequestLocale(locale);
  const display = findSourceDisplay(view.sourceId);
  if (!display || !sourceIds.includes(view.sourceId)) notFound();

  const t = await getTranslations();
  const ranking = await cachedRanking(view.sourceId, view.timeWindow, view.filter);
  const name = viewName(display.name, view);
  const filters = sourceFilters(view.sourceId);

  return (
    <div id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
              {display.name}
            </h1>
            <p className="max-w-prose text-muted-foreground">
              {t(`Sources.${display.id}.description`, { window: view.timeWindow })}
            </p>
          </div>
          {ranking.lastSucceededAt && (
            <Badge variant="outline">
              {t("Ranking.updated")} <LocalTime iso={ranking.lastSucceededAt} />
            </Badge>
          )}
        </div>
        <ViewLinks
          label={t("Ranking.timeWindow")}
          links={timeWindows.map((timeWindow) => ({
            key: timeWindow,
            view: { ...view, timeWindow },
            text: t("Ranking.window", { window: timeWindow }),
            active: timeWindow === view.timeWindow,
          }))}
        />
        {filters.length > 0 && (
          <ViewLinks
            label={t("Ranking.languages")}
            links={[{ id: "", label: t("Ranking.allLanguages") }, ...filters].map(({ id, label }) => ({
              key: id || "all",
              view: { ...view, filter: id },
              text: label,
              active: id === view.filter,
            }))}
          />
        )}
      </div>

      {ranking.items.length === 0 ? (
        <NoRanking command={`pnpm ingest ${view.sourceId}`}>
          {t("Ranking.noRanking", { source: name, window: view.timeWindow })}
        </NoRanking>
      ) : (
        <Card className="py-0">
          <RankingLedger
            display={display}
            timeWindow={view.timeWindow}
            items={ranking.items}
            caption={t("Ranking.caption", { source: name, window: view.timeWindow })}
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
