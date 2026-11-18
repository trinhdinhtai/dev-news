import type { RankedItem, TimeWindow } from "@/domain";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
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
  timeWindow,
  items,
  caption,
}: {
  display: SourceDisplay;
  timeWindow: TimeWindow;
  items: LedgerItem[];
  caption: string;
}) {
  const { figures: columns } = display.rankings[timeWindow];
  return (
    <Table>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-12 pl-4 text-muted-foreground sm:pl-6">Rank</TableHead>
          <TableHead className="text-muted-foreground">{display.itemLabel}</TableHead>
          {columns.map((figure, i) => (
            <TableHead
              key={figure.metric}
              className={cn(
                "hidden text-right text-muted-foreground sm:table-cell",
                i === columns.length - 1 && "pr-4 sm:pr-6",
              )}
            >
              {figure.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          // A repo names its language; anything else names the site it links to.
          const origin = item.programmingLanguage ?? hostOf(item.url);
          return (
            <TableRow key={item.rank} className="relative">
              <TableCell className="py-3 pl-4 align-top font-mono text-base text-muted-foreground tabular-nums sm:pl-6">
                {item.rank}
              </TableCell>
              <TableCell className="py-3 whitespace-normal">
                <div className="flex min-w-0 flex-col gap-1">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm font-medium break-words text-foreground transition-colors after:absolute after:inset-0 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:text-base"
                  >
                    {item.title}
                  </a>
                  {item.description && <p className="break-words text-muted-foreground">{item.description}</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {origin && <Badge variant="secondary">{origin}</Badge>}
                    {/* On a phone the figure columns fold into this line, each with its unit. */}
                    {columns.map((figure) => (
                      <span key={figure.metric} className="font-mono tabular-nums sm:hidden">
                        {figures.format(item.metrics[figure.metric] ?? 0)} {figure.unit}
                      </span>
                    ))}
                  </div>
                </div>
              </TableCell>
              {columns.map((figure, i) => (
                <TableCell
                  key={figure.metric}
                  className={cn(
                    "hidden py-3.5 text-right align-top font-mono tabular-nums sm:table-cell",
                    i === columns.length - 1 && "pr-4 sm:pr-6",
                  )}
                >
                  {figures.format(item.metrics[figure.metric] ?? 0)}
                  <span className="sr-only"> {figure.unit}</span>
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
