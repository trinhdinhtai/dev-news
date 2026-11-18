import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { sourceIds } from "@/domain";
import { domain } from "@/lib/domain";
import { LocalTime } from "../../local-time";
import { sourceDisplay } from "../source-names";

type Props = { params: Promise<{ sourceId: string }> };

const figures = new Intl.NumberFormat("en-US");

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

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
        <div className="ledger-panel">
          <table className="ledger" style={{ "--figure-count": display.figures.length } as CSSProperties}>
            <caption className="visually-hidden">{display.name} daily Source Ranking</caption>
            <thead>
              <tr>
                <th scope="col" className="ledger__rank">
                  Rank
                </th>
                <th scope="col">{display.itemLabel}</th>
                {display.figures.map((figure) => (
                  <th key={figure.metric} scope="col" className="ledger__figure">
                    {figure.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.items.map((item) => {
                // A repo names its language; anything else names the site it links to.
                const origin = item.programmingLanguage ?? hostOf(item.url);
                return (
                  <tr key={item.rank}>
                    <td className="ledger__rank measured">{item.rank}</td>
                    <td className="ledger__story">
                      <a className="ledger__link" href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                      {item.description && <p className="ledger__description">{item.description}</p>}
                      {origin && <span className="ledger__host">{origin}</span>}
                    </td>
                    {display.figures.map((figure) => (
                      <td key={figure.metric} className="ledger__figure measured">
                        {figures.format(item.metrics[figure.metric] ?? 0)}
                        <span className="ledger__unit"> {figure.unit}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer className="screen__foot">
        <p>{display.credit} Each {display.itemLabel.toLowerCase()} opens at its source in a new tab.</p>
      </footer>
    </main>
  );
}
