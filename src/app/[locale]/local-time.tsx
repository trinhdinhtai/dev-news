"use client";

import { type Locale, useLocale } from "next-intl";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * A moment shown in the viewer's own time zone, written the way the interface language
 * writes dates. The server, which cannot know that zone, renders UTC; the browser swaps
 * in local time once it hydrates.
 */
export function LocalTime({ iso }: { iso: string }) {
  const locale = useLocale();
  const label = useSyncExternalStore(
    subscribe,
    () => format(iso, locale, undefined),
    () => format(iso, locale, "UTC"),
  );
  return (
    <time dateTime={iso} className="font-mono tabular-nums">
      {label}
    </time>
  );
}

/** How each interface language writes dates; English uses the day-first British style. */
const dateLocales: Record<Locale, string> = { en: "en-GB", vi: "vi-VN" };

function format(iso: string, locale: Locale, timeZone: string | undefined) {
  const text = new Intl.DateTimeFormat(dateLocales[locale], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(iso));
  return text.replace(",", "");
}
