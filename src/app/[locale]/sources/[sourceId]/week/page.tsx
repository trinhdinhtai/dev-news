import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { SourcePage, sourcePageMetadata, sourceStaticParams } from "../../source-page";

type Props = { params: Promise<{ locale: Locale; sourceId: string }> };

export const generateStaticParams = sourceStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, sourceId } = await params;
  return sourcePageMetadata(locale, sourceId, "week");
}

export default async function WeekPage({ params }: Props) {
  const { locale, sourceId } = await params;
  return <SourcePage locale={locale} sourceId={sourceId} timeWindow="week" />;
}
