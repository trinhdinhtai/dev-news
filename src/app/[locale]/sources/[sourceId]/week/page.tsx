import type { Metadata } from "next";
import { SourcePage, sourcePageMetadata, sourceStaticParams } from "../../source-page";

type Props = { params: Promise<{ locale: string; sourceId: string }> };

export const generateStaticParams = sourceStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return sourcePageMetadata((await params).sourceId, "week");
}

export default async function WeekPage({ params }: Props) {
  const { locale, sourceId } = await params;
  return <SourcePage locale={locale} sourceId={sourceId} timeWindow="week" />;
}
