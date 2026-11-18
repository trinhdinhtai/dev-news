import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { sourceIds } from "@/domain";
import { domain } from "@/lib/domain";
import { LocalTime } from "../../local-time";
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
    <main id="main" className="container screen">
      <div className="screen__head">
        <div className="screen__title">
          <h1>{display.name}</h1>
          <p className="screen__line">{display.dayRanking}</p>
        </div>
        {ranking.lastSucceededAt && (
          <p className="screen__updated">
            Updated <LocalTime iso={ranking.lastSucceededAt.toISOString()} />
          </p>
        )}
      </div>

      {ranking.items.length === 0 ? (
        <section className="empty" aria-labelledby="empty-head">
          <h2 id="empty-head">No ranking collected yet</h2>
          <p>
            The {display.name} ranking appears here after its first collection run. To collect it now, run{" "}
            <code className="measured">pnpm ingest {sourceId}</code>.
          </p>
        </section>
      ) : (
        <RankingLedger display={display} items={ranking.items} caption={`${display.name} daily Source Ranking`} />
      )}

      <footer className="screen__foot">
        <p>{display.credit} Each {display.itemLabel.toLowerCase()} opens at its source in a new tab.</p>
      </footer>
    </main>
  );
}
