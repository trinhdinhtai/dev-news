import { NewspaperIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "@/i18n/navigation";

/** The bar above each page: the sidebar toggle, and on a phone, where the sidebar is hidden, the wordmark. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-center md:hidden" />
      <Link
        href="/"
        aria-label="Dev News, home"
        className="flex items-center gap-2 rounded-md font-heading font-medium tracking-tight whitespace-nowrap focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:hidden"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <NewspaperIcon className="size-3.5" aria-hidden />
        </span>
        Dev News
      </Link>
    </header>
  );
}
