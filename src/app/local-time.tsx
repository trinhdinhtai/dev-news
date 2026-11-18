"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * A moment shown in the viewer's own time zone. The server, which cannot know
 * that zone, renders UTC; the browser swaps in local time once it hydrates.
 */
export function LocalTime({ iso }: { iso: string }) {
  const label = useSyncExternalStore(
    subscribe,
    () => format(iso, undefined),
    () => format(iso, "UTC"),
  );
  return (
    <time dateTime={iso} className="measured">
      {label}
    </time>
  );
}

function format(iso: string, timeZone: string | undefined) {
  const text = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(iso));
  return text.replace(",", "");
}
