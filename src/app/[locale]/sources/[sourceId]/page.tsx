import type { Metadata } from "next";
import { SourcePage, sourcePageMetadata, sourceStaticParams } from "../source-page";

type Props = { params: Promise<{ locale: string; sourceId: string }> };

// The daily Source Ranking is the default, so it lives at the Source's bare path.
export const generateStaticParams = sourceStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return sourcePageMetadata((await params).sourceId, "day");
}

export default async function DayPage({ params }: Props) {
  const { locale, sourceId } = await params;
  return <SourcePage locale={locale} sourceId={sourceId} timeWindow="day" />;
}
