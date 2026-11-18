import Link from "next/link";
import { cachedOverview } from "@/lib/domain";
import { LocalTime } from "./local-time";
import { RankingLedger } from "./sources/ranking-ledger";
import { sourceDisplay } from "./sources/source-names";

// Built once and served static; ingesting a Source revalidates its tag (see /api/revalidate).
export default async function Overview() {
  const overview = await cachedOverview();

  return (
    <main id="main" className="container screen">
      <div className="screen__head">
        <div className="screen__title">
          <h1>Today on every Source</h1>
          <p className="screen__line">
            The top five of each Source&rsquo;s own daily ranking. Scores are not compared across Sources.
          </p>
        </div>
      </div>

      {overview.length === 0 ? (
        <section className="empty" aria-labelledby="empty-head">
          <h2 id="empty-head">No ranking collected yet</h2>
          <p>
            Rankings appear here after a Source&rsquo;s first collection run. To collect one now, run{" "}
            <code className="measured">pnpm ingest hacker-news</code>.
          </p>
        </section>
      ) : (
        overview.map((block) => {
          const display = sourceDisplay[block.sourceId];
          if (!display) return null;
          const headId = `${block.sourceId}-head`;
          return (
            <section key={block.sourceId} className="overview-block" aria-labelledby={headId}>
              <div className="overview-block__head">
                <h2 id={headId}>
                  <Link href={`/sources/${block.sourceId}`} className="overview-block__link">
                    {display.name}
                  </Link>
                </h2>
                {block.lastSucceededAt && (
                  <p className="screen__updated">
                    Updated <LocalTime iso={block.lastSucceededAt} />
                  </p>
                )}
              </div>
              <RankingLedger display={display} items={block.items} caption={`${display.name}, top five today`} />
              <Link href={`/sources/${block.sourceId}`} className="overview-block__more">
                Full {display.name} ranking
              </Link>
            </section>
          );
        })
      )}
    </main>
  );
}
