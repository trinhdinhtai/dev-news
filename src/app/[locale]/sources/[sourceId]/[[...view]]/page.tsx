import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { parseView } from "../../ranking-view";
import { SourcePage, sourcePageMetadata, sourceStaticParams } from "../../source-page";

type Props = { params: Promise<{ locale: Locale; sourceId: string; view?: string[] }> };

// The view after the Source's path: nothing for its daily unfiltered ranking, then an
// optional filter and "week" (/sources/github-trending/python/week).
export const generateStaticParams = sourceStaticParams;

// A view the Source does not have is a 404, not a page built on demand.
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, sourceId, view } = await params;
  const parsed = parseView(sourceId, view);
  return parsed ? sourcePageMetadata(locale, parsed) : {};
}

export default async function SourceViewPage({ params }: Props) {
  const { locale, sourceId, view } = await params;
  const parsed = parseView(sourceId, view);
  if (!parsed) notFound();
  return <SourcePage locale={locale} view={parsed} />;
}
