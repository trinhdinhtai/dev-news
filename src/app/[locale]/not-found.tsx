import { CompassIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Link } from "@/i18n/navigation";

/** Shown for a path no route knows and for a Source that does not exist. */
export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <div id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CompassIcon />
          </EmptyMedia>
          <EmptyTitle>
            <h1>{t("title")}</h1>
          </EmptyTitle>
          <EmptyDescription>{t("description")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            {t("back")}
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
