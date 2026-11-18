"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Links to the same page in each interface language. Following one also writes the
 * NEXT_LOCALE cookie, so the choice holds on the next visit.
 */
export function LanguageSwitch() {
  const t = useTranslations();
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("Nav.language")} className="flex items-center rounded-lg border bg-muted p-0.5">
      {routing.locales.map((locale) => {
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            lang={locale}
            hrefLang={locale}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`Languages.${locale}`)}
          </Link>
        );
      })}
    </nav>
  );
}
