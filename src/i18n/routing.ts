import { defineRouting } from "next-intl/routing";

/**
 * The interface languages. English is the default and keeps the bare paths; Vietnamese
 * lives under /vi. A first visit picks the language from the browser's Accept-Language;
 * after that the NEXT_LOCALE cookie remembers the viewer's choice for a year.
 */
export const routing = defineRouting({
  locales: ["en", "vi"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});
