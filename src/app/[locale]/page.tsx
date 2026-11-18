import { ArrowRightIcon } from "lucide-react";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { cachedOverview } from "@/lib/domain";
import { LocalTime } from "./local-time";
import { NoRanking } from "./sources/no-ranking";
import { RankingLedger } from "./sources/ranking-ledger";
import { findSourceDisplay } from "./sources/source-names";

type Props = { params: Promise<{ locale: Locale }> };

// Built once per language and served static; ingesting a Source revalidates its tag (see /api/revalidate).
export default async function Overview({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  // Regional Sources show only in their own interface language.
  const overview = await cachedOverview(locale);

  return (
    <div id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          {t("Overview.heading")}
        </h1>
        <p className="max-w-prose text-muted-foreground">{t("Overview.intro")}</p>
      </div>

      {overview.length === 0 ? (
        <NoRanking command="pnpm ingest hacker-news">{t("Overview.noRanking")}</NoRanking>
      ) : (
        overview.map((block) => {
          const display = findSourceDisplay(block.sourceId);
          if (!display) return null;
          const headId = `${display.id}-head`;
          const href = `/sources/${display.id}`;
          return (
            <section key={display.id} aria-labelledby={headId}>
              <Card className="pb-0">
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="text-lg">
                    <h2 id={headId}>
                      <Link href={href} className="rounded-sm transition-colors hover:text-primary">
                        {display.name}
                      </Link>
                    </h2>
                  </CardTitle>
                  <CardDescription>
                    {block.lastSucceededAt ? (
                      <>
                        {t("Ranking.updated")} <LocalTime iso={block.lastSucceededAt} />
                      </>
                    ) : (
                      t(`Sources.${display.id}.description`, { window: "day" })
                    )}
                  </CardDescription>
                  <CardAction>
                    <Button variant="outline" size="sm" nativeButton={false} render={<Link href={href} />}>
                      {t("Overview.fullRanking")}
                      <ArrowRightIcon data-icon="inline-end" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="border-t px-0">
                  <RankingLedger
                    display={display}
                    timeWindow="day"
                    items={block.items}
                    caption={t("Overview.caption", { source: display.name })}
                  />
                </CardContent>
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
