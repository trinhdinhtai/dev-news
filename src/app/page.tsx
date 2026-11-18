import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cachedOverview } from "@/lib/domain";
import { LocalTime } from "./local-time";
import { NoRanking } from "./sources/no-ranking";
import { RankingLedger } from "./sources/ranking-ledger";
import { sourceDisplay } from "./sources/source-names";

// Built once and served static; ingesting a Source revalidates its tag (see /api/revalidate).
export default async function Overview() {
  const overview = await cachedOverview();

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Today on every Source
        </h1>
        <p className="max-w-prose text-muted-foreground">
          The top five of each Source&rsquo;s own daily ranking. Scores are not compared across Sources.
        </p>
      </div>

      {overview.length === 0 ? (
        <NoRanking command="pnpm ingest hacker-news">
          Rankings appear here after a Source&rsquo;s first collection run.
        </NoRanking>
      ) : (
        overview.map((block) => {
          const display = sourceDisplay[block.sourceId];
          if (!display) return null;
          const headId = `${block.sourceId}-head`;
          const href = `/sources/${block.sourceId}`;
          return (
            <section key={block.sourceId} aria-labelledby={headId}>
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
                        Updated <LocalTime iso={block.lastSucceededAt} />
                      </>
                    ) : (
                      display.dayRanking
                    )}
                  </CardDescription>
                  <CardAction>
                    <Button variant="outline" size="sm" nativeButton={false} render={<Link href={href} />}>
                      Full ranking
                      <ArrowRightIcon data-icon="inline-end" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="border-t px-0">
                  <RankingLedger display={display} items={block.items} caption={`${display.name}, top five today`} />
                </CardContent>
              </Card>
            </section>
          );
        })
      )}
    </main>
  );
}
