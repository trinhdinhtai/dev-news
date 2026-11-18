import type { Metadata } from "next";
import { SourcePage, sourcePageMetadata, sourceStaticParams } from "../../source-page";

type Props = { params: Promise<{ sourceId: string }> };

export const generateStaticParams = sourceStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return sourcePageMetadata((await params).sourceId, "week");
}

export default async function WeekPage({ params }: Props) {
  return <SourcePage sourceId={(await params).sourceId} timeWindow="week" />;
}
