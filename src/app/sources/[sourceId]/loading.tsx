import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 12;

/** A skeleton in the shape of the ledger that is coming. */
export default function Loading() {
  return (
    <div
      id="main"
      className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12"
      aria-busy="true"
    >
      <p className="sr-only" role="status">
        Loading the ranking
      </p>
      <div className="flex flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full max-w-88" />
      </div>
      <Card className="gap-0 py-0" aria-hidden="true">
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={i} className="flex items-start gap-4 border-b px-4 py-4 last:border-0 sm:px-6">
            <Skeleton className="size-6" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="hidden h-5 w-16 sm:block" />
          </div>
        ))}
      </Card>
    </div>
  );
}
