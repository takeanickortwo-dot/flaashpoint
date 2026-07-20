/**
 * Shared 60s GDELT refresh cycle (design.md §8.12 / §9).
 *
 * One global cycle clock drives the navbar countdown ring and every mounted
 * useGdeltFeed hook, so the ring depletes in sync with refetches. Manual
 * refresh resets the clock and notifies all subscribers; the GDELT request
 * queue in lib/gdelt.ts still enforces the 5s minimum gap between requests.
 */

export const REFRESH_CYCLE_MS = 60000;
export const REFRESH_EVENT = "flashpoint:refresh-now";

let cycleStartAt = Date.now();
let cycleCount = 0;
let timer: number | null = null;
const listeners = new Set<() => void>();

function tick() {
  const now = Date.now();
  while (now - cycleStartAt >= REFRESH_CYCLE_MS) {
    cycleStartAt += REFRESH_CYCLE_MS;
    cycleCount += 1;
  }
  listeners.forEach((l) => l());
}

function ensureTimer() {
  if (timer !== null || typeof window === "undefined") return;
  timer = window.setInterval(tick, 250);
}

export function subscribeRefreshCycle(cb: () => void): () => void {
  listeners.add(cb);
  ensureTimer();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer !== null && typeof window !== "undefined") {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

export interface RefreshCycleState {
  cycleStartAt: number;
  /** Monotonic count of completed cycles (use as refetch key). */
  cycleCount: number;
  secondsRemaining: number;
  /** 0 → 1 elapsed fraction of the current cycle. */
  progress: number;
}

export function getRefreshCycleState(): RefreshCycleState {
  const now = Date.now();
  const elapsed = Math.max(0, now - cycleStartAt);
  const clamped = Math.min(elapsed, REFRESH_CYCLE_MS);
  return {
    cycleStartAt,
    cycleCount,
    secondsRemaining: Math.max(0, Math.ceil((REFRESH_CYCLE_MS - clamped) / 1000)),
    progress: clamped / REFRESH_CYCLE_MS,
  };
}

/** Manual refresh: reset the cycle clock and broadcast to all feed hooks. */
export function requestManualRefresh(): void {
  cycleStartAt = Date.now();
  cycleCount += 1;
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
  }
}
