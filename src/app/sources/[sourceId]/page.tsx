import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { sourceIds } from "@/domain";
import { domain } from "@/lib/domain";
import { LocalTime } from "../../local-time";
import { NoRanking } from "../no-ranking";
import { RankingLedger } from "../ranking-ledger";
import { sourceDisplay } from "../source-names";

type Props = { params: Promise<{ sourceId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sourceId } = await params;
  const display = sourceDisplay[sourceId];
  if (!display) return {};
  return { title: `${display.name} today, Dev News`, description: display.dayRanking };
}

export default async function SourcePage({ params }: Props) {
  // Read the database on each request until collection revalidates the page itself.
  await connection();
  const { sourceId } = await params;
  const display = sourceDisplay[sourceId];
  if (!display || !sourceIds.includes(sourceId)) notFound();

  const ranking = await domain().getSourceRanking({ sourceId, timeWindow: "day" });

  return (
    <div id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">{display.name}</h1>
          <p className="max-w-prose text-muted-foreground">{display.dayRanking}</p>
        </div>
        {ranking.lastSucceededAt && (
          <Badge variant="outline">
            Updated <LocalTime iso={ranking.lastSucceededAt.toISOString()} />
          </Badge>
        )}
      </div>

      {ranking.items.length === 0 ? (
        <NoRanking command={`pnpm ingest ${sourceId}`}>
          The {display.name} ranking appears here after its first collection run.
        </NoRanking>
      ) : (
        <Card className="py-0">
          <RankingLedger display={display} items={ranking.items} caption={`${display.name} daily Source Ranking`} />
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
