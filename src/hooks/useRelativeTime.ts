/**
 * useRelativeTime — "14m ago" style labels that re-render as time passes,
 * plus the exact UTC title-attribute string (design.md §9).
 */

import { useEffect, useState } from "react";

export function relativeTimeLabel(from: Date | number, now: Date | number = Date.now()): string {
  const a = typeof from === "number" ? from : from.getTime();
  const b = typeof now === "number" ? now : now.getTime();
  const s = Math.max(0, Math.floor((b - a) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Exact UTC string for hover titles, e.g. "2026-07-19 04:30:00 UTC". */
export function exactUtcTitle(from: Date | number): string {
  const d = typeof from === "number" ? new Date(from) : from;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(
    d.getUTCHours(),
  )}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
}

/** Ticks every 30s by default so relative labels stay fresh. */
export function useRelativeTime(from: Date | number | null, tickMs = 30000): string {
  const [, force] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  if (from === null) return "—";
  return relativeTimeLabel(from);
}
