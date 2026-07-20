/**
 * Global feed-status registry — useGdeltFeed instances report their status;
 * the navbar aggregates them into the LIVE / DELAYED pill (design.md §8.1).
 */

export type ReportedStatus = "live" | "delayed" | "error";
export type GlobalFeedStatus = ReportedStatus | "idle";

const statuses = new Map<string, ReportedStatus>();
const refCounts = new Map<string, number>();
const listeners = new Set<() => void>();

export function reportFeedStatus(id: string, status: ReportedStatus): void {
  refCounts.set(id, (refCounts.get(id) ?? 0) + 1);
  if (statuses.get(id) === status) return;
  statuses.set(id, status);
  listeners.forEach((l) => l());
}

export function unreportFeedStatus(id: string): void {
  const n = (refCounts.get(id) ?? 1) - 1;
  if (n > 0) {
    refCounts.set(id, n);
    return;
  }
  refCounts.delete(id);
  if (statuses.delete(id)) listeners.forEach((l) => l());
}

/** Aggregate: green when everything reporting is live; amber if any delayed; red if any error with nothing live/delayed. */
export function getGlobalFeedStatus(): GlobalFeedStatus {
  if (statuses.size === 0) return "idle";
  let hasLive = false;
  let hasDelayed = false;
  let hasError = false;
  for (const s of statuses.values()) {
    if (s === "live") hasLive = true;
    else if (s === "delayed") hasDelayed = true;
    else hasError = true;
  }
  if (hasDelayed) return "delayed";
  if (hasError && !hasLive) return "error";
  if (hasLive) return "live";
  return "error";
}

export function subscribeFeedStatus(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Map a feed status to an LED tone (green live / amber delayed / red error). */
export function statusTone(
  status: "loading" | "live" | "delayed" | "error",
): "green" | "amber" | "red" | "field" {
  switch (status) {
    case "live":
      return "green";
    case "delayed":
      return "amber";
    case "error":
      return "red";
    default:
      return "field";
  }
}
