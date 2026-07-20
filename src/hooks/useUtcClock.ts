/**
 * useUtcClock — 1s ticking clock with UTC + local renderings (design.md §8.1).
 */

import { useEffect, useState } from "react";
import { fmtLocalTime, fmtUtcTime } from "@/lib/markets";

export interface UtcClock {
  now: Date;
  /** "04:00:00" UTC */
  utc: string;
  /** Local HH:MM:SS */
  local: string;
  /** "Jul 17 2026" UTC */
  utcDate: string;
  /** Local timezone abbreviation, e.g. "GMT+2" */
  tzLabel: string;
}

function tzAbbr(d: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName");
    return parts?.value ?? "";
  } catch {
    return "";
  }
}

export function useUtcClock(): UtcClock {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return {
    now,
    utc: fmtUtcTime(now),
    local: fmtLocalTime(now),
    utcDate: now.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }),
    tzLabel: tzAbbr(now),
  };
}
