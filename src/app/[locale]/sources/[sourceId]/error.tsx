"use client";

import { DatabaseIcon, RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** Shown when the ranking cannot be read, for instance when the database is unreachable. */
export default function RankingError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("RankingError");
  return (
    <div id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <Empty className="border" role="alert">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <DatabaseIcon />
          </EmptyMedia>
          <EmptyTitle>
            <h2>{t("title")}</h2>
          </EmptyTitle>
          <EmptyDescription>
            {t("description")}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={reset}>
            <RotateCwIcon data-icon="inline-start" />
            {t("retry")}
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
