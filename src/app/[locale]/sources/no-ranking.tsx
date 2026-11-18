import { InboxIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** Shown before a Source's first collection run, with the command that runs one. */
export function NoRanking({ children, command }: { children: ReactNode; command: string }) {
  const t = useTranslations("NoRanking");
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h2>{t("title")}</h2>
        </EmptyTitle>
        <EmptyDescription>
          {children}{" "}
          {t.rich("collectNow", {
            command: () => <code className="font-mono text-foreground">{command}</code>,
          })}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
