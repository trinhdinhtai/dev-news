import { NewspaperIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { sourceDisplay } from "./sources/source-names";

/** One top bar: the wordmark, then a link to each Source's page. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Dev News, home"
          className="flex shrink-0 items-center gap-2 rounded-md font-heading whitespace-nowrap text-lg font-medium tracking-tight focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <NewspaperIcon className="size-4" aria-hidden />
          </span>
          Dev News
        </Link>
        <nav aria-label="Sources" className="ml-auto flex items-center gap-1 overflow-x-auto">
          {Object.entries(sourceDisplay).map(([sourceId, display]) => (
            <Button
              key={sourceId}
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={`/sources/${sourceId}`} />}
            >
              {display.name}
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
