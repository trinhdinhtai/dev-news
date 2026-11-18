import type { CSSProperties } from "react";
import type { RankedItem } from "@/domain";
import type { SourceDisplay } from "./source-names";

/** What the ledger reads off an Item; dates are left out so cached, serialized Items fit too. */
export type LedgerItem = Pick<RankedItem, "rank" | "title" | "url" | "description" | "programmingLanguage" | "metrics">;

const figures = new Intl.NumberFormat("en-US");

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** A Source Ranking as a table: rank, the Item, and the figures its Source shows. */
export function RankingLedger({
  display,
  items,
  caption,
}: {
  display: SourceDisplay;
  items: LedgerItem[];
  caption: string;
}) {
  return (
    <div className="ledger-panel">
      <table className="ledger" style={{ "--figure-count": display.figures.length } as CSSProperties}>
        <caption className="visually-hidden">{caption}</caption>
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
          {items.map((item) => {
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
  );
}
